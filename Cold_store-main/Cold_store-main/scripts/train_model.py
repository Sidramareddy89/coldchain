# train_model.py
"""
Machine‑learning pipeline:
1. Load the two Excel datasets you provided.
2. Combine them into a single DataFrame.
3. Encode the target column `coolingUnitStatus`.
4. Split into train / validation (80 % / 20 %).
5. Train a RandomForestClassifier.
6. Evaluate on the validation set (accuracy & classification report).
7. Save the trained model to `trained_model.joblib`.

Dependencies: pandas, scikit-learn, openpyxl, joblib
Install (if needed):
    pip install pandas scikit-learn openpyxl joblib
"""

import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# -----------------------------------------------------------------------------
# File paths – adjust if you move the files
# -----------------------------------------------------------------------------
FILE1 = Path(r"C:/Users/Siddram reddy/Downloads/coldchain_twin_synthetic_dataset.csv.xlsx")
FILE2 = Path(r"C:/Users/Siddram reddy/Downloads/coldchain_twin_dataset.xlsx")

def load_excel(path: Path) -> pd.DataFrame:
    """Load the first sheet of an Excel workbook into a DataFrame."""
    return pd.read_excel(path, sheet_name=0, engine="openpyxl")

def prepare_data(df: pd.DataFrame):
    # Drop columns that are not useful for the model (timestamp is a string, latitude/longitude may be useful but keep them)
    # Convert timestamp to numeric (epoch) if needed – here we simply drop it for simplicity.
    df = df.copy()
    if "timestamp" in df.columns:
        df = df.drop(columns=["timestamp"])
    return df

def main():
    # Load both datasets
    ds1 = load_excel(FILE1)
    ds2 = load_excel(FILE2)
    df = pd.concat([ds1, ds2], ignore_index=True)
    print(f"Combined dataset shape: {df.shape}")

    # Separate features and target
    X = prepare_data(df.drop(columns=["coolingUnitStatus"]))
    y = df["coolingUnitStatus"]

    # Encode target labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    # Train/validation split (same 80/20 ratio)
    X_train, X_val, y_train, y_val = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    # Train a RandomForest classifier (reasonable defaults for small data)
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # Predict on validation set
    y_pred = clf.predict(X_val)
    acc = accuracy_score(y_val, y_pred)
    report = classification_report(y_val, y_pred, target_names=le.classes_, zero_division=0)

    print("\n=== Validation Results ===")
    print(f"Accuracy: {acc:.4f}")
    print(report)

    # Save the model and the label encoder for future use
    model_path = Path("trained_model.joblib")
    le_path = Path("label_encoder.joblib")
    joblib.dump(clf, model_path)
    joblib.dump(le, le_path)
    print(f"\nModel saved to {model_path.resolve()}")
    print(f"Label encoder saved to {le_path.resolve()}")

if __name__ == "__main__":
    main()
