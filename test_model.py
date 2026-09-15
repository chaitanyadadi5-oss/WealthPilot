import joblib


# Load the trained model
model = joblib.load("expense_classifier.joblib")


# Test transactions
transactions = [
    "Ordered pizza from Domino's",
    "Paid electricity bill",
    "Filled petrol for my bike",
    "Bought a new shirt",
    "Purchased medicines from pharmacy",
    "Paid college tuition fees",
    "Watched a movie at the theatre",
    "Withdrew cash from ATM"
]


# Predict categories
predictions = model.predict(transactions)


# Display results
for transaction, prediction in zip(transactions, predictions):
    print(f"{transaction} → {prediction}")