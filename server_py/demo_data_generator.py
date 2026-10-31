# server_py/demo_data_generator.py
# Generates 520+ realistic synthetic feedback records labeled [DEMO DATA]
# Matches all 13 required fields:
# customer_id, feedback_id, feedback_text, rating, product, location, source, date,
# order_id, transaction_id, delivery_partner, order_status, refund_status

import random
from datetime import datetime, timedelta

CITIES = [
    {"city": "Chennai", "state": "Tamil Nadu", "weight": 35},
    {"city": "Bangalore", "state": "Karnataka", "weight": 20},
    {"city": "Mumbai", "state": "Maharashtra", "weight": 15},
    {"city": "Delhi", "state": "Delhi NCR", "weight": 12},
    {"city": "Hyderabad", "state": "Telangana", "weight": 8},
    {"city": "Pune", "state": "Maharashtra", "weight": 5},
    {"city": "Coimbatore", "state": "Tamil Nadu", "weight": 3},
    {"city": "Madurai", "state": "Tamil Nadu", "weight": 2}
]

PRODUCTS = [
    "SmartHome Hub Pro",
    "Smart Air Purifier X1",
    "UltraSound ANC Headphones",
    "4K Security Camera 360",
    "ErgoDesk Smart Controller",
    "SwiftCharge 100W PowerBank"
]

SOURCES = [
    "Customer Reviews",
    "Customer Surveys",
    "Support Tickets",
    "Social Media",
    "Contact Center"
]

DELIVERY_PARTNERS = [
    "ExpressLogistics",
    "BlueDart Express",
    "Delhivery Prime",
    "Shadowfax Logistics",
    "SpeedPost India"
]

CUSTOMER_TIERS = ["Enterprise", "VIP", "Premium", "Regular", "New"]

ISSUE_TEMPLATES = {
    "chennai_delivery": [
        "Package stuck at Chennai central depot for 5 days with no movement. Tracking shows out for delivery but nothing arrived.",
        "Terrible delivery experience in Chennai. ExpressLogistics agent never called and marked customer unavailable falsely.",
        "Ordered my SmartHome Hub Pro last week in Chennai, still waiting. Delivery date got postponed 3 times.",
        "ExpressLogistics depot in Chennai has zero customer support. Delivery is delayed by over 96 hours.",
        "Very slow transit in Chennai. The delivery partner ExpressLogistics claims delivery attempted when I was home all day."
    ],
    "payment_refund": [
        "Money deducted from HDFC UPI account but order failed and no order ID was generated. Refund still pending after 7 days.",
        "Cancelled the order within 10 minutes, but my refund of ₹4,299 has not been credited. Bank says gateway timeout callback failed.",
        "Double charged during payment checkout. Customer support ticket #7842 is still open without any refund resolution.",
        "UPI transaction timed out at payment screen. Bank confirmed debit, but platform shows payment pending and refund not initiated."
    ],
    "product_quality": [
        "Smart Air Purifier X1 PM2.5 dust sensor keeps blinking red and showing erroneous 999 AQI readings out of the box.",
        "Air Purifier sensor stopped working within 48 hours of unboxing. Filter smells like burning plastic.",
        "Device arrived with cracked front panel. Packaging was intact, so factory quality control is clearly defective.",
        "The noise level on my UltraSound ANC Headphones is unbearable. Left earcup has static buzz on high ANC mode."
    ],
    "customer_support": [
        "Your chatbot is completely useless. It loops back to the main menu without connecting to any human agent.",
        "Waited 45 minutes on contact center phone call and agent abruptly hung up without giving a ticket ID.",
        "Support team closed my escalation ticket #9102 without actually resolving the issue or calling me."
    ],
    "positive": [
        "Outstanding product! SmartHome Hub Pro integrated seamlessly with all my smart devices in under 5 minutes.",
        "Super fast delivery by BlueDart in Bangalore! Arrived in under 24 hours and packaging was immaculate.",
        "Loved the noise cancellation on UltraSound ANC Headphones. Crisp bass and long battery life. 5 stars!"
    ],
    "neutral": [
        "Product is decent and works as described, but user manual lacks clear setup diagrams.",
        "Average experience. Delivery took the standard 4 days. Nothing exceptional, nothing bad.",
        "App user interface could be improved. The hardware is fine but Bluetooth pairing is a bit sluggish."
    ]
}

def pick_city():
    total = sum(c["weight"] for c in CITIES)
    r = random.uniform(0, total)
    for c in CITIES:
        if r < c["weight"]:
            return c["city"]
        r -= c["weight"]
    return CITIES[0]["city"]

def generate_demo_records(count=525):
    records = []
    now = datetime.now()

    for i in range(1, count + 1):
        feedback_id = f"FB-{str(i).zfill(5)}"
        customer_id = f"CUST-{random.randint(1001, 1450)}"
        order_id = f"ORD-2026-{random.randint(10000, 99999)}"
        transaction_id = f"TXN-{random.randint(1000000, 9999999)}"
        source = random.choice(SOURCES)
        tier = random.choice(CUSTOMER_TIERS)

        days_ago = random.randint(0, 28)
        date_obj = now - timedelta(days=days_ago)
        date_str = date_obj.strftime("%Y-%m-%d")

        rand = random.random()
        city = pick_city()
        product = random.choice(PRODUCTS)
        partner = random.choice(DELIVERY_PARTNERS)
        order_status = "Delivered"
        refund_status = "None"

        if rand < 0.35:
            # Negative
            sub_rand = random.random()
            if sub_rand < 0.45:
                city = "Chennai"
                partner = "ExpressLogistics"
                text = random.choice(ISSUE_TEMPLATES["chennai_delivery"])
                rating = random.choice([1, 2])
                order_status = "In Transit - Delayed"
                category = "Delivery"
                sentiment = "Negative"
            elif sub_rand < 0.70:
                text = random.choice(ISSUE_TEMPLATES["payment_refund"])
                rating = 1
                order_status = "Failed"
                refund_status = "Processing Overdue"
                category = "Refund"
                sentiment = "Negative"
            elif sub_rand < 0.88:
                product = "Smart Air Purifier X1"
                text = random.choice(ISSUE_TEMPLATES["product_quality"])
                rating = random.choice([1, 2])
                order_status = "Delivered"
                refund_status = "Return Requested"
                category = "Product Quality"
                sentiment = "Negative"
            else:
                text = random.choice(ISSUE_TEMPLATES["customer_support"])
                rating = random.choice([1, 2])
                order_status = "Delivered"
                category = "Customer Support"
                sentiment = "Negative"
        elif rand < 0.80:
            text = random.choice(ISSUE_TEMPLATES["positive"])
            rating = random.choice([4, 5])
            category = "Product Quality"
            sentiment = "Positive"
        else:
            text = random.choice(ISSUE_TEMPLATES["neutral"])
            rating = 3
            category = "Other"
            sentiment = "Neutral"

        records.append({
            "customer_id": customer_id,
            "customer_tier": tier,
            "feedback_id": feedback_id,
            "feedback_text": f"[DEMO DATA] {text}",
            "rating": rating,
            "product": product,
            "location": city,
            "source": source,
            "date": date_str,
            "order_id": order_id,
            "transaction_id": transaction_id,
            "delivery_partner": partner,
            "order_status": order_status,
            "refund_status": refund_status,
            "raw_sentiment": sentiment,
            "assigned_category": category,
            "created_at": date_obj.isoformat()
        })

    return records
