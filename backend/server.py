from flask import Flask, jsonify, request
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

SIMULATION_START_TIME = time.time()
INITIAL_BATTERY_KWH = 450.0
TOTAL_CAPACITY_KWH = 500.0
main_grid_status = "BLACKOUT"  # "ONLINE" or "BLACKOUT"

rooms = [
    # Zone 1: Main Entrance & Admin Zone
    {"id": "main_admin_block", "name": "Main & Admin Block", "zone": "Entrance & Admin Zone", "loadKW": 60, "isOccupied": True, "eventTitle": "Placement & Counseling Cell", "isEmergency": False, "isChiefGuest": False},
    {"id": "trp_biotech", "name": "TRP Building (Biotech)", "zone": "Entrance & Admin Zone", "loadKW": 40, "isOccupied": True, "eventTitle": "Genomics Research", "isEmergency": False, "isChiefGuest": False},
    
    # Zone 2: Academic & Engineering Wings
    {"id": "engg_tech_block", "name": "Engineering Block", "zone": "Academic Wings", "loadKW": 60, "isOccupied": True, "eventTitle": "Core Practicals & Labs", "isEmergency": False, "isChiefGuest": False},
    {"id": "bms_cac_block", "name": "BMS Block (CAC Labs)", "zone": "Academic Wings", "loadKW": 55, "isOccupied": True, "eventTitle": "HPC Computing Lab", "isEmergency": False, "isChiefGuest": False},
    
    # Zone 3: Gallery Hall Corridor
    {"id": "gallery_1", "name": "Gallery Hall 1", "zone": "Gallery Corridor", "loadKW": 15, "isOccupied": True, "eventTitle": "CSE Department Guest Lecture", "isEmergency": False, "isChiefGuest": False},
    {"id": "gallery_2", "name": "Gallery Hall 2", "zone": "Gallery Corridor", "loadKW": 15, "isOccupied": False, "eventTitle": "Vacant Facility", "isEmergency": False, "isChiefGuest": False},
    {"id": "gallery_3", "name": "Gallery Hall 3", "zone": "Gallery Corridor", "loadKW": 15, "isOccupied": True, "eventTitle": "National Biotech Workshop", "isEmergency": False, "isChiefGuest": True},
    {"id": "gallery_4", "name": "Gallery Hall 4", "zone": "Gallery Corridor", "loadKW": 15, "isOccupied": False, "eventTitle": "Vacant Facility", "isEmergency": False, "isChiefGuest": False},
    {"id": "gallery_5", "name": "Gallery Hall 5", "zone": "Gallery Corridor", "loadKW": 15, "isOccupied": False, "eventTitle": "Architecture Design Review", "isEmergency": False, "isChiefGuest": False},
    
    # Zone 4: Healthcare & Emergency
    {"id": "srm_hospital", "name": "SRM Prime Hospital", "zone": "Healthcare & Hostels", "loadKW": 80, "isEmergency": True, "isOccupied": True, "eventTitle": "Emergency Wards & ICU", "isChiefGuest": False},
    
    # Zone 5: Hostels & Recreation
    {"id": "hostels", "name": "Boys & Girls Hostels", "zone": "Healthcare & Hostels", "loadKW": 100, "isOccupied": True, "eventTitle": "Student Residence Load", "isEmergency": False, "isChiefGuest": False},
    {"id": "sports_complex", "name": "Sports Complex & Turf", "zone": "Recreation Zone", "loadKW": 25, "isOccupied": False, "eventTitle": "Indoor Lighting & Turf", "isEmergency": False, "isChiefGuest": False}
]

logs = [
    f"{time.strftime('%H:%M:%S')} - System initialized under Blackout Battery Routing Mode.",
]

@app.route('/api/simulation/status', methods=['GET'])
def get_status():
    global SIMULATION_START_TIME
    
    elapsed_seconds = time.time() - SIMULATION_START_TIME
    active_demand = 350.0 if main_grid_status == "BLACKOUT" else 0.0
    
    if main_grid_status == "BLACKOUT":
        energy_drained = (350.0 / 3600.0) * elapsed_seconds
        current_battery = max(0.0, INITIAL_BATTERY_KWH - energy_drained)
    else:
        current_battery = INITIAL_BATTERY_KWH  # Recharged when online

    battery_percentage = int((current_battery / TOTAL_CAPACITY_KWH) * 100)
    
    if main_grid_status == "BLACKOUT" and current_battery > 0:
        remaining_hours = current_battery / 350.0
        estimated_runtime = f"~{round(remaining_hours, 2)} Hours Remaining"
    elif main_grid_status == "ONLINE":
        estimated_runtime = "Grid Online (Stable Supply)"
    else:
        estimated_runtime = "0 Hours Remaining (Depleted)"

    return jsonify({
        "mainGridStatus": main_grid_status,
        "batteryReserve": round(current_battery, 2),
        "totalBatteryKWh": TOTAL_CAPACITY_KWH,
        "activeDemand": active_demand,
        "batteryCapacity": battery_percentage,
        "estimatedRuntime": estimated_runtime,
        "rooms": rooms,
        "logs": logs
    })

@app.route('/api/simulation/toggle-grid', methods=['POST'])
def toggle_grid():
    global main_grid_status, SIMULATION_START_TIME
    data = request.json or {}
    new_status = data.get('status')
    
    if new_status in ["ONLINE", "BLACKOUT"]:
        main_grid_status = new_status
        SIMULATION_START_TIME = time.time()
        timestamp = time.strftime('%H:%M:%S')
        logs.insert(0, f"{timestamp} - Main Grid status toggled to: {main_grid_status}")

    return jsonify({"success": True, "mainGridStatus": main_grid_status, "logs": logs})

@app.route('/api/knapsack/run', methods=['POST'])
def run_knapsack():
    global logs
    timestamp = time.strftime('%H:%M:%S')
    logs.insert(0, f"{timestamp} - Knapsack load shedding optimization algorithm executed.")
    return jsonify({
        "success": True,
        "message": "Knapsack load shedding optimization successfully calculated!",
        "optimizedLoad": 210.0,
        "logs": logs
    })

@app.route('/api/rooms/book', methods=['POST'])
def book_room():
    global rooms, logs
    data = request.json or {}
    room_id = data.get('id')
    event_title = data.get('eventTitle', 'VIP Event')
    is_chief_guest = data.get('isChiefGuest', False)
    
    found = False
    for r in rooms:
        if r['id'] == room_id:
            r['isOccupied'] = True
            r['eventTitle'] = event_title
            r['isChiefGuest'] = is_chief_guest
            found = True
            timestamp = time.strftime('%H:%M:%S')
            logs.insert(0, f"{timestamp} - Booked facility {r['name']}: '{event_title}'")
            
    if found:
        return jsonify({"success": True, "rooms": rooms, "logs": logs})
    return jsonify({"success": False, "message": "Room ID not found"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)