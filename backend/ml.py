from functools import lru_cache
from pathlib import Path

import joblib


MODEL_PATH = Path(__file__).resolve().parent.parent / "expense_classifier.joblib"


class ModelLoadError(RuntimeError):
    """Raised when the saved expense classifier cannot be loaded."""


@lru_cache
def get_expense_classifier():
    """Load and cache the trusted, pre-trained expense classifier."""
    if not MODEL_PATH.is_file():
        raise ModelLoadError("Expense classifier model file was not found")

    try:
        return joblib.load(MODEL_PATH)
    except (OSError, ValueError, EOFError) as exc:
        raise ModelLoadError("Expense classifier model could not be loaded") from exc


def predict_expense_category(description: str) -> tuple[str, float | None]:
    """Return the model category prediction and probability when supported."""
    model = get_expense_classifier()
    predicted_category = str(model.predict([description])[0])

    predict_proba = getattr(model, "predict_proba", None)
    if not callable(predict_proba):
        return predicted_category, None

    probabilities = predict_proba([description])[0]
    confidence = float(max(probabilities))

    return predicted_category, confidence
