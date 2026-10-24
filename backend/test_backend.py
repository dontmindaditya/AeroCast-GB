"""
Unit tests for AeroCast GB Python Backend
"""
import pytest
import numpy as np

def calculate_mae(forecasts, actuals):
    return float(np.mean(np.abs(np.array(forecasts) - np.array(actuals))))

def calculate_rmse(forecasts, actuals):
    return float(np.sqrt(np.mean((np.array(forecasts) - np.array(actuals)) ** 2)))

def calculate_bias(forecasts, actuals):
    return float(np.mean(np.array(forecasts) - np.array(actuals)))

def calculate_wape(forecasts, actuals):
    sum_act = np.sum(actuals)
    if sum_act == 0:
        return 0.0
    return float((np.sum(np.abs(np.array(forecasts) - np.array(actuals))) / sum_act) * 100.0)

def test_metrics_calculation():
    f = [12000, 14000, 16000]
    a = [10000, 13000, 17000]
    # errors: [2000, 1000, -1000], abs: [2000, 1000, 1000]
    assert calculate_mae(f, a) == pytest.approx(1333.33, rel=1e-2)
    assert calculate_bias(f, a) == pytest.approx(666.67, rel=1e-2)
    assert calculate_wape(f, a) == pytest.approx(10.0, rel=1e-2)

def test_thermal_residual_calculation():
    demand = 35000
    wind_forecast = 14000
    residual = max(0, demand - wind_forecast)
    assert residual == 21000
