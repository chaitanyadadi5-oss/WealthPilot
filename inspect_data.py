import pandas as pd

df = pd.read_csv("synthetic_indian_transactions.csv")

print("Dataset shape:", df.shape)
print("\nFirst 5 rows:")
print(df.head())

print("\nColumns:")
print(df.columns)

print("\nCategories:")
print(df["category"].value_counts())

print("\nMissing values:")
print(df.isnull().sum())

print("\nDuplicate rows:", df.duplicated().sum())