package com.omkarkarale.medlinkiot.models

enum class ComponentType(val displayName: String) {
    STEPPER_MOTOR_1("Stepper Motor 1"),
    STEPPER_MOTOR_2("Stepper Motor 2"),
    STEPPER_MOTOR_3("Stepper Motor 3"),
    RTC_MODULE("RTC Module"),
    IR_SENSOR("IR Sensor"),
    SPEAKER("Speaker"),
    OLED_DISPLAY("OLED Display"),
    WIFI_STACK("WiFi Stack"),
    API_GATEWAY("REST API Gateway")
}

enum class ComponentStatus {
    OK,
    WARNING,
    ERROR,
    OFFLINE,
    TESTING
}
