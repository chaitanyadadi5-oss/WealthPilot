import re
from datetime import date as date_type, datetime

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from sqlalchemy.orm import Session
from database.database import SessionLocal, User

from database.crud import (
    get_user_by_email,
    create_user,

    create_transaction,
    get_transactions,
    update_transaction,
    delete_transaction,

    create_budget,
    get_budgets,
    update_budget,
    delete_budget,

    create_savings_goal,
    get_savings_goals,
    update_savings_goal,
    delete_savings_goal,

    create_planned_expense,
    get_planned_expenses,
    update_planned_expense,
    delete_planned_expense,

    create_actual_saving,
    get_actual_savings,
    update_actual_saving,
    delete_actual_saving,

    get_profile,
    create_or_update_profile,

    get_financial_preferences,
    create_or_update_financial_preferences,
)

from backend.auth import (
    create_access_token,
    get_current_user_id,
    hash_password,
    verify_password,
)

from backend.dashboard import build_dashboard

from backend.ml import (
    ModelLoadError,
    predict_expense_category,
)


# =========================================
# APP
# =========================================

app = FastAPI(
    title="AI Finance Assistant",
    description="Backend API for the AI Finance Assistant",
    version="1.0.0",
)


# =========================================
# CORS
# =========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================
# DATABASE DEPENDENCY
# =========================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# =========================================
# COMMON VALIDATORS
# =========================================

def validate_month(value: str) -> str:
    month = value.strip()

    if not re.fullmatch(
        r"\d{4}-(0[1-9]|1[0-2])",
        month,
    ):
        raise ValueError(
            "Month must be in YYYY-MM format"
        )

    return month


# =========================================
# AUTH SCHEMAS
# =========================================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "Name must not be empty"
            )

        if len(value) > 100:
            raise ValueError(
                "Name must not exceed 100 characters"
            )

        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()

        if not re.fullmatch(
            r"[^@\s]+@[^@\s]+\.[^@\s]+",
            value,
        ):
            raise ValueError(
                "Please enter a valid email address"
            )

        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError(
                "Password must contain at least 6 characters"
            )

        return value


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


# =========================================
# TRANSACTION SCHEMAS
# =========================================

class CategoryPredictionRequest(BaseModel):
    description: str

    @field_validator("description")
    @classmethod
    def description_must_not_be_empty(
        cls,
        value: str,
    ) -> str:
        description = value.strip()

        if not description:
            raise ValueError(
                "Description must not be empty"
            )

        return description


class TransactionRequest(BaseModel):
    description: str
    merchant: str | None = None
    amount: float = Field(gt=0)
    date: date_type
    transaction_type: str
    category: str | None = None

    @field_validator("description")
    @classmethod
    def validate_description(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "Description must not be empty"
            )

        return value

    @field_validator("merchant")
    @classmethod
    def validate_merchant(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("transaction_type")
    @classmethod
    def validate_transaction_type(
        cls,
        value: str,
    ) -> str:
        value = value.strip().lower()

        if value not in {
            "income",
            "expense",
        }:
            raise ValueError(
                "Transaction type must be income or expense"
            )

        return value

    @field_validator("category")
    @classmethod
    def validate_category(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None


class TransactionUpdateRequest(BaseModel):
    description: str | None = None
    merchant: str | None = None
    amount: float | None = Field(
        default=None,
        gt=0,
    )
    date: date_type | None = None
    transaction_type: str | None = None
    category: str | None = None

    @field_validator("description")
    @classmethod
    def validate_description(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError(
                "Description must not be empty"
            )

        return value

    @field_validator("merchant")
    @classmethod
    def validate_merchant(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("transaction_type")
    @classmethod
    def validate_transaction_type(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip().lower()

        if value not in {
            "income",
            "expense",
        }:
            raise ValueError(
                "Transaction type must be income or expense"
            )

        return value

    @field_validator("category")
    @classmethod
    def validate_category(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None


# =========================================
# BUDGET SCHEMAS
# =========================================

class BudgetRequest(BaseModel):
    category: str
    amount: float = Field(gt=0)
    month: str

    @field_validator("category")
    @classmethod
    def validate_category(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "Category must not be empty"
            )

        return value

    @field_validator("month")
    @classmethod
    def month_must_be_yyyy_mm(
        cls,
        value: str,
    ) -> str:
        return validate_month(value)


class BudgetUpdateRequest(BaseModel):
    category: str | None = None
    amount: float | None = Field(
        default=None,
        gt=0,
    )
    month: str | None = None

    @field_validator("category")
    @classmethod
    def validate_category(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError(
                "Category must not be empty"
            )

        return value

    @field_validator("month")
    @classmethod
    def month_must_be_yyyy_mm(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return validate_month(value)


# =========================================
# SAVINGS GOAL SCHEMAS
# =========================================

class SavingsGoalRequest(BaseModel):
    target_amount: float = Field(gt=0)
    month: str

    @field_validator("month")
    @classmethod
    def month_must_be_yyyy_mm(
        cls,
        value: str,
    ) -> str:
        return validate_month(value)


class SavingsGoalUpdateRequest(BaseModel):
    target_amount: float | None = Field(
        default=None,
        gt=0,
    )
    month: str | None = None

    @field_validator("month")
    @classmethod
    def month_must_be_yyyy_mm(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return validate_month(value)


# =========================================
# PLANNED EXPENSE SCHEMAS
# =========================================

class PlannedExpenseRequest(BaseModel):
    category: str
    description: str | None = None
    planned_amount: float = Field(gt=0)
    month: str

    @field_validator("category")
    @classmethod
    def validate_category(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "Category must not be empty"
            )

        return value

    @field_validator("description")
    @classmethod
    def validate_description(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("month")
    @classmethod
    def month_must_be_yyyy_mm(
        cls,
        value: str,
    ) -> str:
        return validate_month(value)


class PlannedExpenseUpdateRequest(BaseModel):
    category: str | None = None
    description: str | None = None
    planned_amount: float | None = Field(
        default=None,
        gt=0,
    )
    month: str | None = None

    @field_validator("category")
    @classmethod
    def validate_category(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError(
                "Category must not be empty"
            )

        return value

    @field_validator("description")
    @classmethod
    def validate_description(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("month")
    @classmethod
    def month_must_be_yyyy_mm(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return validate_month(value)


# =========================================
# ACTUAL SAVINGS SCHEMAS
# =========================================

class ActualSavingRequest(BaseModel):
    amount: float = Field(gt=0)
    date: date_type
    note: str | None = None

    @field_validator("note")
    @classmethod
    def validate_note(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None


class ActualSavingUpdateRequest(BaseModel):
    amount: float | None = Field(
        default=None,
        gt=0,
    )
    date: date_type | None = None
    note: str | None = None

    @field_validator("note")
    @classmethod
    def validate_note(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None


# =========================================
# PROFILE SCHEMA
# =========================================

class ProfileRequest(BaseModel):
    age: int | None = Field(
        default=None,
        ge=13,
        le=120,
    )
    gender: str | None = None
    profession: str | None = None
    marital_status: str | None = None

    @field_validator(
        "gender",
        "profession",
        "marital_status",
    )
    @classmethod
    def clean_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None


# =========================================
# FINANCIAL PREFERENCES SCHEMA
# =========================================

class FinancialPreferencesRequest(BaseModel):
    monthly_income_range: str | None = None
    income_source: str | None = None
    currency: str = "INR"
    financial_goal: str | None = None
    savings_target: float | None = Field(
        default=None,
        gt=0,
    )
    reminders_enabled: bool = True

    @field_validator(
        "monthly_income_range",
        "income_source",
        "financial_goal",
    )
    @classmethod
    def clean_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("currency")
    @classmethod
    def validate_currency(
        cls,
        value: str,
    ) -> str:
        value = value.strip().upper()

        if not value:
            raise ValueError(
                "Currency must not be empty"
            )

        return value


# =========================================
# HOME
# =========================================

@app.get("/")
def home():
    return {
        "message": "AI Finance Assistant API is running!"
    }


# =========================================
# REGISTER
# =========================================

@app.post("/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing_user = get_user_by_email(
        db,
        request.email,
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered",
        )

    user = create_user(
        db=db,
        name=request.name,
        email=request.email,
        password_hash=hash_password(
            request.password
        ),
    )

    return {
        "message": "Registration successful",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


# =========================================
# LOGIN
# =========================================

@app.post("/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(
        db,
        request.email,
    )

    if (
        user is None
        or not verify_password(
            request.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user.id)

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }

@app.get("/me")
def get_current_user(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == current_user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
    }
# =========================================
# DASHBOARD
# =========================================

@app.get("/dashboard")
def read_dashboard(
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    transactions = get_transactions(
        db=db,
        user_id=current_user_id,
    )

    budgets = get_budgets(
        db=db,
        user_id=current_user_id,
    )

    savings_goals = get_savings_goals(
        db=db,
        user_id=current_user_id,
    )

    planned_expenses = get_planned_expenses(
        db=db,
        user_id=current_user_id,
    )

    actual_savings = get_actual_savings(
        db=db,
        user_id=current_user_id,
    )

    current_month = datetime.now().strftime(
        "%Y-%m"
    )

    return build_dashboard(
        transactions=transactions,
        budgets=budgets,
        savings_goals=savings_goals,
        planned_expenses=planned_expenses,
        actual_savings=actual_savings,
        current_month=current_month,
    )


# =========================================
# CATEGORY PREDICTION
# =========================================

@app.post("/predict-category")
def predict_category(
    request: CategoryPredictionRequest,
    current_user_id: int = Depends(get_current_user_id),
):
    try:
        predicted_category, confidence = predict_expense_category(
            request.description
        )

    except ModelLoadError as exc:
        raise HTTPException(
            status_code=503,
            detail="Expense classifier is unavailable",
        ) from exc

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate category prediction",
        )

    return {
        "description": request.description,
        "predicted_category": predicted_category,
        "confidence": confidence,
    }

# =========================================
# CREATE TRANSACTION
# =========================================

@app.post("/transactions")
def add_transaction(
    request: TransactionRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    predicted_category = None

    if request.transaction_type == "expense":
        try:
            prediction_result = predict_expense_category(
                request.description
            )

            if isinstance(prediction_result, tuple):
                predicted_category = prediction_result[0]
            else:
                predicted_category = prediction_result

        except ModelLoadError:
            predicted_category = None

        except Exception:
            predicted_category = None

    # User-selected category always wins.
    final_category = (
        request.category
        or predicted_category
        or "Other"
    )

    transaction = create_transaction(
        db=db,
        user_id=current_user_id,
        description=request.description,
        merchant=request.merchant,
        amount=request.amount,
        transaction_date=request.date,
        transaction_type=request.transaction_type,
        category=final_category,
        predicted_category=predicted_category,
    )

    return {
        "message": "Transaction created successfully",
        "transaction": transaction,
    }


# =========================================
# GET TRANSACTIONS
# =========================================

@app.get("/transactions")
def read_transactions(
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    transactions = get_transactions(
        db=db,
        user_id=current_user_id,
    )

    return {
        "transactions": transactions
    }


# =========================================
# UPDATE TRANSACTION
# =========================================

@app.put("/transactions/{transaction_id}")
def edit_transaction(
    transaction_id: int,
    request: TransactionUpdateRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    transaction = update_transaction(
        db=db,
        transaction_id=transaction_id,
        user_id=current_user_id,
        description=request.description,
        merchant=request.merchant,
        amount=request.amount,
        transaction_date=request.date,
        transaction_type=request.transaction_type,
        category=request.category,
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    return {
        "message": "Transaction updated successfully",
        "transaction": transaction,
    }


# =========================================
# DELETE TRANSACTION
# =========================================

@app.delete("/transactions/{transaction_id}")
def remove_transaction(
    transaction_id: int,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    transaction = delete_transaction(
        db=db,
        transaction_id=transaction_id,
        user_id=current_user_id,
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    return {
        "message": "Transaction deleted successfully"
    }


# =========================================
# BUDGETS
# =========================================

@app.post("/budgets")
def add_budget(
    request: BudgetRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    budget = create_budget(
        db=db,
        user_id=current_user_id,
        category=request.category,
        amount=request.amount,
        month=request.month,
    )

    return {
        "message": "Budget created successfully",
        "budget": budget,
    }


@app.get("/budgets")
def read_budgets(
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    return {
        "budgets": get_budgets(
            db=db,
            user_id=current_user_id,
        )
    }


@app.put("/budgets/{budget_id}")
def edit_budget(
    budget_id: int,
    request: BudgetUpdateRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    budget = update_budget(
        db=db,
        budget_id=budget_id,
        user_id=current_user_id,
        category=request.category,
        amount=request.amount,
        month=request.month,
    )

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    return {
        "message": "Budget updated successfully",
        "budget": budget,
    }


@app.delete("/budgets/{budget_id}")
def remove_budget(
    budget_id: int,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    budget = delete_budget(
        db=db,
        budget_id=budget_id,
        user_id=current_user_id,
    )

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    return {
        "message": "Budget deleted successfully"
    }


# =========================================
# SAVINGS GOALS
# =========================================

@app.post("/savings-goals")
def add_savings_goal(
    request: SavingsGoalRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    goal = create_savings_goal(
        db=db,
        user_id=current_user_id,
        target_amount=request.target_amount,
        month=request.month,
    )

    return {
        "message": "Savings goal created successfully",
        "savings_goal": goal,
    }


@app.get("/savings-goals")
def read_savings_goals(
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    return {
        "savings_goals": get_savings_goals(
            db=db,
            user_id=current_user_id,
        )
    }


@app.put("/savings-goals/{goal_id}")
def edit_savings_goal(
    goal_id: int,
    request: SavingsGoalUpdateRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    goal = update_savings_goal(
        db=db,
        goal_id=goal_id,
        user_id=current_user_id,
        target_amount=request.target_amount,
        month=request.month,
    )

    if goal is None:
        raise HTTPException(
            status_code=404,
            detail="Savings goal not found",
        )

    return {
        "message": "Savings goal updated successfully",
        "savings_goal": goal,
    }


@app.delete("/savings-goals/{goal_id}")
def remove_savings_goal(
    goal_id: int,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    goal = delete_savings_goal(
        db=db,
        goal_id=goal_id,
        user_id=current_user_id,
    )

    if goal is None:
        raise HTTPException(
            status_code=404,
            detail="Savings goal not found",
        )

    return {
        "message": "Savings goal deleted successfully"
    }


# =========================================
# PLANNED EXPENSES
# =========================================

@app.post("/planned-expenses")
def add_planned_expense(
    request: PlannedExpenseRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    planned_expense = create_planned_expense(
        db=db,
        user_id=current_user_id,
        category=request.category,
        description=request.description,
        planned_amount=request.planned_amount,
        month=request.month,
    )

    return {
        "message": (
            "Planned expense created successfully"
        ),
        "planned_expense": planned_expense,
    }


@app.get("/planned-expenses")
def read_planned_expenses(
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    return {
        "planned_expenses": get_planned_expenses(
            db=db,
            user_id=current_user_id,
        )
    }


@app.put("/planned-expenses/{planned_expense_id}")
def edit_planned_expense(
    planned_expense_id: int,
    request: PlannedExpenseUpdateRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    planned_expense = update_planned_expense(
        db=db,
        planned_expense_id=planned_expense_id,
        user_id=current_user_id,
        category=request.category,
        description=request.description,
        planned_amount=request.planned_amount,
        month=request.month,
    )

    if planned_expense is None:
        raise HTTPException(
            status_code=404,
            detail="Planned expense not found",
        )

    return {
        "message": (
            "Planned expense updated successfully"
        ),
        "planned_expense": planned_expense,
    }


@app.delete("/planned-expenses/{planned_expense_id}")
def remove_planned_expense(
    planned_expense_id: int,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    planned_expense = delete_planned_expense(
        db=db,
        planned_expense_id=planned_expense_id,
        user_id=current_user_id,
    )

    if planned_expense is None:
        raise HTTPException(
            status_code=404,
            detail="Planned expense not found",
        )

    return {
        "message": (
            "Planned expense deleted successfully"
        )
    }


# =========================================
# ACTUAL SAVINGS
# =========================================

@app.post("/actual-savings")
def add_actual_saving(
    request: ActualSavingRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    saving = create_actual_saving(
        db=db,
        user_id=current_user_id,
        amount=request.amount,
        saving_date=request.date,
        note=request.note,
    )

    return {
        "message": (
            "Actual saving recorded successfully"
        ),
        "actual_saving": saving,
    }


@app.get("/actual-savings")
def read_actual_savings(
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    return {
        "actual_savings": get_actual_savings(
            db=db,
            user_id=current_user_id,
        )
    }


@app.put("/actual-savings/{saving_id}")
def edit_actual_saving(
    saving_id: int,
    request: ActualSavingUpdateRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    saving = update_actual_saving(
        db=db,
        saving_id=saving_id,
        user_id=current_user_id,
        amount=request.amount,
        saving_date=request.date,
        note=request.note,
    )

    if saving is None:
        raise HTTPException(
            status_code=404,
            detail="Actual saving not found",
        )

    return {
        "message": "Actual saving updated successfully",
        "actual_saving": saving,
    }


@app.delete("/actual-savings/{saving_id}")
def remove_actual_saving(
    saving_id: int,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    saving = delete_actual_saving(
        db=db,
        saving_id=saving_id,
        user_id=current_user_id,
    )

    if saving is None:
        raise HTTPException(
            status_code=404,
            detail="Actual saving not found",
        )

    return {
        "message": "Actual saving deleted successfully"
    }


# =========================================
# PROFILE
# =========================================

@app.get("/profile")
def read_profile(
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    profile = get_profile(
        db=db,
        user_id=current_user_id,
    )

    return {
        "profile": profile
    }


@app.put("/profile")
def save_profile(
    request: ProfileRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    profile = create_or_update_profile(
        db=db,
        user_id=current_user_id,
        age=request.age,
        gender=request.gender,
        profession=request.profession,
        marital_status=request.marital_status,
    )

    return {
        "message": "Profile updated successfully",
        "profile": profile,
    }


# =========================================
# FINANCIAL PREFERENCES
# =========================================

@app.get("/financial-preferences")
def read_financial_preferences(
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    preferences = get_financial_preferences(
        db=db,
        user_id=current_user_id,
    )

    return {
        "financial_preferences": preferences
    }


@app.put("/financial-preferences")
def save_financial_preferences(
    request: FinancialPreferencesRequest,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    preferences = (
        create_or_update_financial_preferences(
            db=db,
            user_id=current_user_id,
            monthly_income_range=(
                request.monthly_income_range
            ),
            income_source=request.income_source,
            currency=request.currency,
            financial_goal=request.financial_goal,
            savings_target=request.savings_target,
            reminders_enabled=(
                request.reminders_enabled
            ),
        )
    )

    return {
        "message": (
            "Financial preferences updated successfully"
        ),
        "financial_preferences": preferences,
    }