import pandas as pd

# Load the original dataset
df = pd.read_csv("synthetic_indian_transactions.csv")

# Remove duplicate rows
df = df.drop_duplicates()

# Remove income transactions
df = df[df["category"] != "Income & Deposits"]

# Map original categories to our project categories
category_mapping = {
    "Eating Out": "Food",
    "Groceries": "Food",

    "Transportation & Gas": "Transport",
    "Travel": "Transport",

    "Shopping & Clothing": "Shopping",

    "Entertainment & Subscriptions": "Entertainment",
    "Kids Activities": "Entertainment",

    "Medicine & Pharmacy": "Health",
    "Hospital & Medical": "Health",
    "Personal Care": "Health",

    "Education": "Education",

    "Utilities": "Bills",
    "Rent & Mortgage": "Bills",
    "Insurance": "Bills",
    "Fees & Interest": "Bills",

    "ATM & Cash": "Other",
    "Investments & Savings Transfer": "Other"
}

# Apply the mapping
df["category"] = df["category"].map(category_mapping)

# Save the cleaned dataset
df.to_csv("cleaned_transactions.csv", index=False)

# Display results
print("Cleaned dataset shape:", df.shape)

print("\nCategories:")
print(df["category"].value_counts())

print("\nMissing values:")
print(df.isnull().sum())

print("\nCleaned dataset saved as: cleaned_transactions.csv")