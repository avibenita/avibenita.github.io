"""Quick smoke test for logistic_power modes."""
from main import logistic_power


class MockRequest:
    def __init__(self, body, method="POST"):
        self.method = method
        self._body = body

    def get_json(self, silent=True):
        return self._body


def run(body):
    body, status, _ = logistic_power(MockRequest(body))
    assert body["ok"], body.get("error")
    return body["results"]


if __name__ == "__main__":
    epv = run({"mode": "epv", "n_total": 100, "n_events": 30, "n_predictors": 3})
    print("EPV", epv["current_epv"], epv["adequacy"])

    single = run({
        "mode": "single_predictor",
        "task": "power",
        "n": 200,
        "outcome_prevalence": 0.3,
        "exposure_prevalence": 0.5,
        "odds_ratio": 1.8,
        "alpha": 0.05,
    })
    print("Single power", single["observed_power"])

    sim = run({
        "mode": "multivariable_simulation",
        "n": 150,
        "n_predictors": 2,
        "outcome_prevalence": 0.25,
        "effect_odds_ratios": [1.6, 1.3],
        "n_simulations": 100,
        "coefficient_index": 1,
    })
    print("Sim power", sim["simulated_power"], "valid", sim["n_simulations_valid"])
    print("OK")
