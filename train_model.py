import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


# 1. Load the cleaned dataset
df = pd.read_csv("cleaned_transactions.csv")


# 2. Separate features and target
X = df["text"]
y = df["category"]


# 3. Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# 4. Create the ML pipeline
model = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("classifier", LogisticRegression(max_iter=1000))
])


# 5. Train the model
model.fit(X_train, y_train)


# 6. Make predictions on unseen test data
y_pred = model.predict(X_test)


# 7. Evaluate the model
accuracy = accuracy_score(y_test, y_pred)

print("Model Accuracy:", accuracy)

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))


# 8. Save the trained model
joblib.dump(model, "expense_classifier.joblib")

print("\nModel saved as: expense_classifier.joblib")