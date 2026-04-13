"""Shared pytest fixtures."""

import pytest


@pytest.fixture(autouse=True)
def _clear_recipe_image_url_cache():
    """Isolate tests that share in-memory recipe image URL cache."""
    from app import ai_service

    ai_service._recipe_image_url_cache.clear()
    yield
    ai_service._recipe_image_url_cache.clear()
