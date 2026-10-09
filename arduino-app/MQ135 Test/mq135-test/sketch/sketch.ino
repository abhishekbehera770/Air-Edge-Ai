#include <Arduino_RouterBridge.h>
#include <BitBang_LiquidCrystal_I2C.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT11
#define MQ135_PIN A2
#define LED_PIN 3
#define SWITCH_PIN 2

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2, 8, 9);

const int AIR_ALERT_THRESHOLD = 80;

void setup() {
  Serial.begin(9600);

  pinMode(SWITCH_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);

  dht.begin();
  lcd.init();
  lcd.backlight();
  lcd.clear();

  Bridge.begin();

  lcd.setCursor(0, 0);
  lcd.print("AirEdge AI");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(1500);

  Serial.println("AirEdge AI started");
}

void loop() {
  bool systemOn = (digitalRead(SWITCH_PIN) == LOW);

  if (!systemOn) {
    digitalWrite(LED_PIN, LOW);
    Bridge.notify("air_data", "{\"system_on\":false}");
    delay(2000);
    return;
  }

  int airValue = analogRead(MQ135_PIN);
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  bool alert = airValue > AIR_ALERT_THRESHOLD;

  digitalWrite(LED_PIN, alert ? HIGH : LOW);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Air Raw: ");
  lcd.print(airValue);
  lcd.setCursor(0, 1);

  if (isnan(temperature) || isnan(humidity)) {
    lcd.print("DHT Read Error");
  } else {
    lcd.print(temperature, 1);
    lcd.print("C ");
    lcd.print(humidity, 0);
    lcd.print("%");
  }

  String data = "{\"system_on\":true,\"air_raw\":";
  data += String(airValue);
  data += ",\"temperature\":";
  data += isnan(temperature) ? "null" : String(temperature, 2);
  data += ",\"humidity\":";
  data += isnan(humidity) ? "null" : String(humidity, 2);
  data += ",\"alert\":\"";
  data += alert ? "ALERT" : "NORMAL";
  data += "\"}";

  Bridge.notify("air_data", data);

  Serial.println(data);
  delay(2000);
}