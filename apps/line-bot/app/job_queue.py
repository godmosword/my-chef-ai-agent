"""Async job queue for webhook event processing."""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Literal

from app.config import QUEUE_DEDUPE_TTL_SEC, QUEUE_MAX_SIZE, QUEUE_WORKER_COUNT, logger
from app.models import WebhookImageEvent, WebhookMessageEvent, WebhookPostbackEvent
from app.observability import incr, reset_request_id, reset_user_hash, set_request_id, set_user_hash

JobType = Literal["text", "image", "postback"]
JobEvent = WebhookMessageEvent | WebhookImageEvent | WebhookPostbackEvent


@dataclass
class QueueJob:
    job_type: JobType
    event: JobEvent
    event_id: str
    request_id: str = "-"
    user_hash: str = "-"
    trace_carrier: dict[str, str] | None = None


_job_queue: asyncio.Queue[QueueJob] = asyncio.Queue(maxsize=QUEUE_MAX_SIZE)
_workers: list[asyncio.Task] = []
_seen_event_ids: dict[str, float] = {}


def _cleanup_seen_event_ids() -> None:
    now = time.monotonic()
    expired = [eid for eid, ts in _seen_event_ids.items() if now - ts > QUEUE_DEDUPE_TTL_SEC]
    for eid in expired:
        _seen_event_ids.pop(eid, None)


def _mark_if_new(event_id: str) -> bool:
    _cleanup_seen_event_ids()
    return event_id not in _seen_event_ids


async def enqueue_job(job: QueueJob) -> JobType | Literal["deduplicated", "queue_full"]:
    if not _mark_if_new(job.event_id):
        incr("queue.deduplicated_total")
        return "deduplicated"
    try:
        _job_queue.put_nowait(job)
        # Keep dedupe mark only for successfully queued events.
        _seen_event_ids[job.event_id] = time.monotonic()
        incr("queue.enqueued_total")
        return job.job_type
    except asyncio.QueueFull:
        _seen_event_ids.pop(job.event_id, None)
        incr("queue.dropped_full_total")
        logger.warning("Job queue full; dropping event %s", job.event_id)
        return "queue_full"


async def _process_job(job: QueueJob) -> None:
    from app.handlers import process_ai_reply, process_image_reply, process_postback_reply

    trace_token = None
    try:
        if job.trace_carrier:
            from opentelemetry import context as otel_context
            from opentelemetry.propagate import extract

            ctx = extract(job.trace_carrier)
            trace_token = otel_context.attach(ctx)
    except Exception:
        trace_token = None

    try:
        tracer = None
        try:
            from opentelemetry import trace

            tracer = trace.get_tracer("chef-agent.queue")
        except Exception:
            tracer = None

        async def _dispatch() -> None:
            if job.job_type == "text":
                await process_ai_reply(job.event)  # type: ignore[arg-type]
            elif job.job_type == "image":
                await process_image_reply(job.event)  # type: ignore[arg-type]
            else:
                await process_postback_reply(job.event)  # type: ignore[arg-type]

        if tracer:
            with tracer.start_as_current_span(f"queue.process_{job.job_type}"):
                await _dispatch()
        else:
            await _dispatch()
    finally:
        if trace_token is not None:
            try:
                from opentelemetry import context as otel_context

                otel_context.detach(trace_token)
            except Exception:
                pass


async def _worker_loop(worker_id: int) -> None:
    logger.info("Queue worker started: %s", worker_id)
    while True:
        job = await _job_queue.get()
        req_token = set_request_id(job.request_id)
        user_token = set_user_hash(job.user_hash)
        try:
            incr("queue.processing_total")
            await _process_job(job)
            incr("queue.processed_total")
        except Exception:
            incr("queue.errors_total")
            logger.exception("Queue worker failed processing event %s", job.event_id)
        finally:
            reset_request_id(req_token)
            reset_user_hash(user_token)
            _job_queue.task_done()


async def start_queue_workers() -> None:
    if _workers:
        return
    for idx in range(QUEUE_WORKER_COUNT):
        _workers.append(asyncio.create_task(_worker_loop(idx + 1), name=f"line-job-worker-{idx + 1}"))
    logger.info("Queue workers initialized: count=%s", QUEUE_WORKER_COUNT)


async def stop_queue_workers() -> None:
    tasks = list(_workers)
    _workers.clear()
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
