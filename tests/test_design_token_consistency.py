from app import design_tokens as dt
from app import flex_theme as fx
from app import recipe_poster as poster
from app import recipe_poster_html as poster_html
from app import ui_contracts as ui


def test_flex_theme_uses_shared_tokens() -> None:
    assert fx.PRIMARY_BG == dt.BACKGROUND
    assert fx.SURFACE_CARD == dt.SURFACE
    assert fx.ACCENT_ORANGE == dt.PRIMARY
    assert fx.SECTION_LABEL == dt.GREEN
    assert fx.ROLE_COLORS["食材總管"] == dt.ROLE_INGREDIENT_MANAGER


def test_poster_html_uses_shared_tokens() -> None:
    assert poster_html.COLOR_ACCENT == dt.PRIMARY
    assert poster_html.COLOR_GREEN == dt.GREEN
    assert poster_html.COLOR_BODY_BG == dt.BACKGROUND_ALT
    assert poster_html.COLOR_BORDER == dt.BORDER


def test_poster_pillow_uses_shared_tokens() -> None:
    assert poster.BG == dt.hex_to_rgb(dt.BACKGROUND_ALT)
    assert poster.CARD == dt.hex_to_rgb(dt.SURFACE)
    assert poster.STEP_BADGE == dt.hex_to_rgb(dt.GREEN)


def test_ui_contracts_map_to_tokens() -> None:
    assert ui.BUTTON_PRIMARY_BG == dt.PRIMARY
    assert ui.BUTTON_SECONDARY_BG == dt.GREEN
    assert ui.SECTION_TITLE_TEXT == dt.GREEN
