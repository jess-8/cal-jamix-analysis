from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import datetime
import calendar
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable requests from JS frontend

def transform_col(df, col):
    new_col = df[col].astype(str).str.split(" ").str[0]
    return pd.to_datetime(new_col)

def calculate_finances(df, date_col, price_col, beg_date, end_date):
    beg_date = pd.to_datetime(beg_date)
    end_date = pd.to_datetime(end_date)
    lim_df = df[(df[date_col] >= beg_date) & (df[date_col] <= end_date)]
    return np.sum(lim_df[price_col])

def find_last_sunday(year, month, monday=False, last_day=False):
    if last_day:
        return f"{month}/{calendar.monthrange(year, month)[1]}/{year}"
    if month == 12:
        year += 1
        month = 1
    else:
        month += 1
    curr_dt = datetime.datetime(year, month, 1)
    curr_dt -= datetime.timedelta(days=curr_dt.weekday() + 1)
    if monday:
        curr_dt += datetime.timedelta(days=1)
    return curr_dt.strftime("%m/%d/%Y")

@app.route("/process-deliveries", methods=["POST"])
def process_deliveries():
    # ✅ Only expecting a single "file" input from frontend
    file = request.files["file"]
    dates = eval(request.form.get("dates"))  # [[2024, 7], ...]

    df = pd.read_csv(file, skiprows=1)
    df["Delivery date"] = transform_col(df, "Delivery date")
    df["Price"] = pd.to_numeric(df["Price"], errors="coerce")

    results = []
    for year, month in dates:
        fiscal_beg = f"{month}/1/{year}"
        if month == 1:
            dining_beg = find_last_sunday(year - 1, 12, monday=True)
        elif year == 2024 and month == 7:
            dining_beg = fiscal_beg
        else:
            dining_beg = find_last_sunday(year, month - 1, monday=True)
        fiscal_end = find_last_sunday(year, month, last_day=True)
        dining_end = find_last_sunday(year, month)

        dining = calculate_finances(df, "Delivery date", "Price", dining_beg, dining_end)
        fiscal = calculate_finances(df, "Delivery date", "Price", fiscal_beg, fiscal_end)
        diff = abs(dining - fiscal)

        results.append({
            "Month / Year": f"{month}/{year}",
            "Dining Finances": round(dining, 2),
            "Fiscal Finances": round(fiscal, 2),
            "Absolute Differences": round(diff, 2)
        })

    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True)
