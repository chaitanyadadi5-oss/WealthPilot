from sqlalchemy.orm import Session

from database.database import (
    User,
    Transaction,
    Budget,
    SavingsGoal,
    PlannedExpense,
    ActualSaving,
    Profile,
    FinancialPreference,
)


# =========================================
# USER CRUD
# =========================================

def get_user_by_email(db: Session, email: str):
    return (
        db.query(User)
        .filter(User.email == email)
        .first()
    )


def create_user(
    db: Session,
    name: str,
    email: str,
    password_hash: str,
):
    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# =========================================
# TRANSACTION CRUD
# =========================================

def create_transaction(
    db: Session,
    user_id: int,
    description: str,
    merchant: str | None,
    amount: float,
    transaction_date,
    transaction_type: str,
    category: str,
    predicted_category: str | None = None,
):
    transaction = Transaction(
        user_id=user_id,
        description=description,
        merchant=merchant,
        amount=amount,
        date=transaction_date,
        transaction_type=transaction_type,
        category=category,
        predicted_category=predicted_category,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


def get_transactions(
    db: Session,
    user_id: int,
):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(
            Transaction.date.desc(),
            Transaction.id.desc(),
        )
        .all()
    )


def update_transaction(
    db: Session,
    transaction_id: int,
    user_id: int,
    description: str | None = None,
    merchant: str | None = None,
    amount: float | None = None,
    transaction_date=None,
    transaction_type: str | None = None,
    category: str | None = None,
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
        )
        .first()
    )

    if transaction is None:
        return None

    if description is not None:
        transaction.description = description

    if merchant is not None:
        transaction.merchant = merchant

    if amount is not None:
        transaction.amount = amount

    if transaction_date is not None:
        transaction.date = transaction_date

    if transaction_type is not None:
        transaction.transaction_type = transaction_type

    if category is not None:
        transaction.category = category

    db.commit()
    db.refresh(transaction)

    return transaction


def delete_transaction(
    db: Session,
    transaction_id: int,
    user_id: int,
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
        )
        .first()
    )

    if transaction is None:
        return None

    db.delete(transaction)
    db.commit()

    return transaction


# =========================================
# BUDGET CRUD
# =========================================

def create_budget(
    db: Session,
    user_id: int,
    category: str,
    amount: float,
    month: str,
):
    budget = Budget(
        user_id=user_id,
        category=category,
        amount=amount,
        month=month,
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    return budget


def get_budgets(
    db: Session,
    user_id: int,
):
    return (
        db.query(Budget)
        .filter(Budget.user_id == user_id)
        .order_by(
            Budget.month.desc(),
            Budget.id.desc(),
        )
        .all()
    )


def update_budget(
    db: Session,
    budget_id: int,
    user_id: int,
    category: str | None = None,
    amount: float | None = None,
    month: str | None = None,
):
    budget = (
        db.query(Budget)
        .filter(
            Budget.id == budget_id,
            Budget.user_id == user_id,
        )
        .first()
    )

    if budget is None:
        return None

    if category is not None:
        budget.category = category

    if amount is not None:
        budget.amount = amount

    if month is not None:
        budget.month = month

    db.commit()
    db.refresh(budget)

    return budget


def delete_budget(
    db: Session,
    budget_id: int,
    user_id: int,
):
    budget = (
        db.query(Budget)
        .filter(
            Budget.id == budget_id,
            Budget.user_id == user_id,
        )
        .first()
    )

    if budget is None:
        return None

    db.delete(budget)
    db.commit()

    return budget


# =========================================
# SAVINGS GOAL CRUD
# =========================================

def create_savings_goal(
    db: Session,
    user_id: int,
    target_amount: float,
    month: str,
):
    goal = SavingsGoal(
        user_id=user_id,
        target_amount=target_amount,
        month=month,
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)

    return goal


def get_savings_goals(
    db: Session,
    user_id: int,
):
    return (
        db.query(SavingsGoal)
        .filter(SavingsGoal.user_id == user_id)
        .order_by(
            SavingsGoal.month.desc(),
            SavingsGoal.id.desc(),
        )
        .all()
    )


def update_savings_goal(
    db: Session,
    goal_id: int,
    user_id: int,
    target_amount: float | None = None,
    month: str | None = None,
):
    goal = (
        db.query(SavingsGoal)
        .filter(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == user_id,
        )
        .first()
    )

    if goal is None:
        return None

    if target_amount is not None:
        goal.target_amount = target_amount

    if month is not None:
        goal.month = month

    db.commit()
    db.refresh(goal)

    return goal


def delete_savings_goal(
    db: Session,
    goal_id: int,
    user_id: int,
):
    goal = (
        db.query(SavingsGoal)
        .filter(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == user_id,
        )
        .first()
    )

    if goal is None:
        return None

    db.delete(goal)
    db.commit()

    return goal


# =========================================
# PLANNED EXPENSE CRUD
# =========================================

def create_planned_expense(
    db: Session,
    user_id: int,
    category: str,
    description: str | None,
    planned_amount: float,
    month: str,
):
    planned_expense = PlannedExpense(
        user_id=user_id,
        category=category,
        description=description,
        planned_amount=planned_amount,
        month=month,
    )

    db.add(planned_expense)
    db.commit()
    db.refresh(planned_expense)

    return planned_expense


def get_planned_expenses(
    db: Session,
    user_id: int,
):
    return (
        db.query(PlannedExpense)
        .filter(PlannedExpense.user_id == user_id)
        .order_by(
            PlannedExpense.month.desc(),
            PlannedExpense.id.desc(),
        )
        .all()
    )


def update_planned_expense(
    db: Session,
    planned_expense_id: int,
    user_id: int,
    category: str | None = None,
    description: str | None = None,
    planned_amount: float | None = None,
    month: str | None = None,
):
    planned_expense = (
        db.query(PlannedExpense)
        .filter(
            PlannedExpense.id == planned_expense_id,
            PlannedExpense.user_id == user_id,
        )
        .first()
    )

    if planned_expense is None:
        return None

    if category is not None:
        planned_expense.category = category

    if description is not None:
        planned_expense.description = description

    if planned_amount is not None:
        planned_expense.planned_amount = planned_amount

    if month is not None:
        planned_expense.month = month

    db.commit()
    db.refresh(planned_expense)

    return planned_expense


def delete_planned_expense(
    db: Session,
    planned_expense_id: int,
    user_id: int,
):
    planned_expense = (
        db.query(PlannedExpense)
        .filter(
            PlannedExpense.id == planned_expense_id,
            PlannedExpense.user_id == user_id,
        )
        .first()
    )

    if planned_expense is None:
        return None

    db.delete(planned_expense)
    db.commit()

    return planned_expense


# =========================================
# ACTUAL SAVINGS CRUD
# =========================================

def create_actual_saving(
    db: Session,
    user_id: int,
    amount: float,
    saving_date,
    note: str | None = None,
):
    actual_saving = ActualSaving(
        user_id=user_id,
        amount=amount,
        date=saving_date,
        note=note,
    )

    db.add(actual_saving)
    db.commit()
    db.refresh(actual_saving)

    return actual_saving


def get_actual_savings(
    db: Session,
    user_id: int,
):
    return (
        db.query(ActualSaving)
        .filter(ActualSaving.user_id == user_id)
        .order_by(
            ActualSaving.date.desc(),
            ActualSaving.id.desc(),
        )
        .all()
    )


def update_actual_saving(
    db: Session,
    saving_id: int,
    user_id: int,
    amount: float | None = None,
    saving_date=None,
    note: str | None = None,
):
    actual_saving = (
        db.query(ActualSaving)
        .filter(
            ActualSaving.id == saving_id,
            ActualSaving.user_id == user_id,
        )
        .first()
    )

    if actual_saving is None:
        return None

    if amount is not None:
        actual_saving.amount = amount

    if saving_date is not None:
        actual_saving.date = saving_date

    if note is not None:
        actual_saving.note = note

    db.commit()
    db.refresh(actual_saving)

    return actual_saving


def delete_actual_saving(
    db: Session,
    saving_id: int,
    user_id: int,
):
    actual_saving = (
        db.query(ActualSaving)
        .filter(
            ActualSaving.id == saving_id,
            ActualSaving.user_id == user_id,
        )
        .first()
    )

    if actual_saving is None:
        return None

    db.delete(actual_saving)
    db.commit()

    return actual_saving


# =========================================
# PROFILE CRUD
# =========================================

def get_profile(
    db: Session,
    user_id: int,
):
    return (
        db.query(Profile)
        .filter(Profile.user_id == user_id)
        .first()
    )


def create_or_update_profile(
    db: Session,
    user_id: int,
    age: int | None = None,
    gender: str | None = None,
    profession: str | None = None,
    marital_status: str | None = None,
):
    profile = get_profile(db, user_id)

    if profile is None:
        profile = Profile(
            user_id=user_id,
            age=age,
            gender=gender,
            profession=profession,
            marital_status=marital_status,
        )

        db.add(profile)

    else:
        profile.age = age
        profile.gender = gender
        profile.profession = profession
        profile.marital_status = marital_status

    db.commit()
    db.refresh(profile)

    return profile


# =========================================
# FINANCIAL PREFERENCES CRUD
# =========================================

def get_financial_preferences(
    db: Session,
    user_id: int,
):
    return (
        db.query(FinancialPreference)
        .filter(
            FinancialPreference.user_id == user_id
        )
        .first()
    )


def create_or_update_financial_preferences(
    db: Session,
    user_id: int,
    monthly_income_range: str | None = None,
    income_source: str | None = None,
    currency: str = "INR",
    financial_goal: str | None = None,
    savings_target: float | None = None,
    reminders_enabled: bool = True,
):
    preferences = get_financial_preferences(
        db,
        user_id,
    )

    if preferences is None:
        preferences = FinancialPreference(
            user_id=user_id,
            monthly_income_range=monthly_income_range,
            income_source=income_source,
            currency=currency,
            financial_goal=financial_goal,
            savings_target=savings_target,
            reminders_enabled=reminders_enabled,
        )

        db.add(preferences)

    else:
        preferences.monthly_income_range = monthly_income_range
        preferences.income_source = income_source
        preferences.currency = currency
        preferences.financial_goal = financial_goal
        preferences.savings_target = savings_target
        preferences.reminders_enabled = reminders_enabled

    db.commit()
    db.refresh(preferences)

    return preferences