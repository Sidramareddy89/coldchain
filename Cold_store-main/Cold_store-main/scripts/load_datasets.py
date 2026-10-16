# load_datasets.py
"""
Python script to:
1. Load two Excel files (provided by the user).
2. Print a quick summary: number of rows, column names, first 5 rows.
3. Split each dataset into an 80/20 train‑validation split.
4. (Optional) Export the splits to CSV files.

Dependencies: pandas, openpyxl, scikit-learn
Install with: pip install pandas openpyxl scikit-learn
"""

import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split

# -----------------------------------------------------------------------------
# File paths – adjust if you move the files
# -----------------------------------------------------------------------------
FILE1 = Path(r"C:/Users/Siddram reddy/Downloads/coldchain_twin_synthetic_dataset.csv.xlsx")
FILE2 = Path(r"C:/Users/Siddram reddy/Downloads/coldchain_twin_dataset.xlsx")

def load_excel(path: Path) -> pd.DataFrame:
    """Load the first sheet of an Excel workbook into a DataFrame."""
    return pd.read_excel(path, sheet_name=0, engine="openpyxl")

def summarize(df: pd.DataFrame, label: str) -> None:
    print(f"\n--- {label} ---")
    print(f"Rows: {len(df)}")
    print(f"Columns ({len(df.columns)}): {', '.join(df.columns)}")
    print("First 5 rows:")
    print(df.head())

def split_dataset(df: pd.DataFrame, train_ratio: float = 0.8):
    return train_test_split(df, test_size=1 - train_ratio, random_state=42)

def export_csv(df: pd.DataFrame, out_path: Path) -> None:
    df.to_csv(out_path, index=False)

def main():
    # Load datasets
    ds1 = load_excel(FILE1)
    ds2 = load_excel(FILE2)

    # Summarize
    summarize(ds1, "Dataset 1")
    summarize(ds2, "Dataset 2")

    # Split
    train1, val1 = split_dataset(ds1)
    train2, val2 = split_dataset(ds2)

    print("\nSplit results:")
    print(f"Dataset 1 – Train: {len(train1)} rows, Validation: {len(val1)} rows")
    print(f"Dataset 2 – Train: {len(train2)} rows, Validation: {len(val2)} rows")

    # Optional: export splits (uncomment to use)
    # export_csv(train1, Path('dataset1_train.csv'))
    # export_csv(val1,   Path('dataset1_val.csv'))
    # export_csv(train2, Path('dataset2_train.csv'))
    # export_csv(val2,   Path('dataset2_val.csv'))

if __name__ == "__main__":
    main()
