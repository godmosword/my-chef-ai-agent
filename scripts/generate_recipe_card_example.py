from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.recipe_card_generator import compose_recipe_card, generate_base_image, load_recipe_json


async def main() -> None:
    parser = argparse.ArgumentParser(description="Generate two-stage recipe card PNG")
    parser.add_argument("--recipe", default="examples/sample-recipe.json")
    parser.add_argument("--base", default="output/recipe-base.png")
    parser.add_argument("--final", default="output/recipe-final.png")
    parser.add_argument("--skip-api", action="store_true", help="Skip Stage A API call and create a local placeholder base")
    args = parser.parse_args()

    recipe = load_recipe_json(args.recipe)

    if args.skip_api:
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
=======
        Path(args.base).parent.mkdir(parents=True, exist_ok=True)
>>>>>>> theirs
=======
        Path(args.base).parent.mkdir(parents=True, exist_ok=True)
>>>>>>> theirs
=======
        Path(args.base).parent.mkdir(parents=True, exist_ok=True)
>>>>>>> theirs
=======
        Path(args.base).parent.mkdir(parents=True, exist_ok=True)
>>>>>>> theirs
        Image.new("RGB", (1200, 1500), (247, 242, 232)).save(args.base)
        base_path = args.base
    else:
        base_path = await generate_base_image(recipe, output_path=args.base)

    final_path = compose_recipe_card(recipe=recipe, base_image_path=base_path, output_path=args.final)
    print(final_path)


if __name__ == "__main__":
    asyncio.run(main())
