import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

class CollisionModel:
    def __init__(self):
        self.model_path = "collision_model.joblib"
        self.model = self._load_or_train_model()

    def _load_or_train_model(self):
        if os.path.exists(self.model_path):
            return joblib.load(self.model_path)
        raise FileNotFoundError(f"Model file {self.model_path} not found. Please ensure the trained model is present.")

    def predict(self, data):
        # data: [miss_distance_km, relative_velocity_kms, bstar_drag, position_covariance, combined_mass_kg]
        features = np.array(data).reshape(1, -1)
        probability = self.model.predict(features)[0]
        return np.clip(probability, 0, 100)

    def get_alert_level(self, probability):
        if probability > 75:
            return "CRITICAL"
        elif probability > 40:
            return "WARNING"
        return "LOW"
