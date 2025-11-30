#!/usr/bin/env python3
"""
Extract ELWA kWh data from my-PV screenshots
The green bars represent daily kWh consumption
"""

import os
import re
from PIL import Image

# Screenshot directory
SCREENSHOT_DIR = "/Users/christian/Apps/haustracker/docs/elwa-screenshots"

# Color ranges for green bars (Leistung - grün/gelb)
GREEN_R_MIN, GREEN_R_MAX = 100, 180
GREEN_G_MIN, GREEN_G_MAX = 170, 230
GREEN_B_MIN, GREEN_B_MAX = 0, 80

# Color ranges for orange bars (Leistung 1 - orange)
ORANGE_R_MIN, ORANGE_R_MAX = 200, 255
ORANGE_G_MIN, ORANGE_G_MAX = 140, 200
ORANGE_B_MIN, ORANGE_B_MAX = 0, 80

def extract_month_from_filename(filename):
    """Extract year and month from filename like 'mypv-1601502406190027-2025-02.png'"""
    match = re.search(r'(\d{4})-(\d{2})\.png$', filename)
    if match:
        year, month = match.groups()
        return int(year), int(month)
    return None, None

def get_days_in_month(year, month):
    """Get number of days in a month"""
    import calendar
    return calendar.monthrange(year, month)[1]

def extract_kwh_values(image_path, year, month):
    """Extract kWh values from screenshot by analyzing green bars"""
    img = Image.open(image_path).convert('RGB')

    # Get image dimensions
    width, height = img.size

    # Define regions (approximate based on screenshot structure)
    # X-axis starts around x=60 and ends around x=width-60
    # Y-axis: chart area is roughly from y=50 to y=height-80
    chart_left = 60
    chart_right = width - 60
    chart_top = 50
    chart_bottom = height - 80

    # Number of days in this month
    num_days = get_days_in_month(year, month)

    # Calculate width per day
    day_width = (chart_right - chart_left) / num_days

    # Extract values for each day
    daily_values = []

    for day in range(1, num_days + 1):
        # Calculate X position for this day (center of the day's column)
        day_x_center = int(chart_left + (day - 0.5) * day_width)
        day_x_start = int(chart_left + (day - 1) * day_width)
        day_x_end = int(chart_left + day * day_width)

        # Look for green AND orange pixels in this day's column
        # Both represent energy (Leistung + Leistung 1)
        max_bar_height = 0
        bar_pixel_count = 0

        for y in range(chart_bottom, chart_top, -1):
            for x in range(day_x_start, day_x_end):
                if x < width and y < height:
                    try:
                        pixel = img.getpixel((x, y))
                        r, g, b = pixel[0], pixel[1], pixel[2]

                        # Check if pixel is green or orange
                        is_green = (GREEN_R_MIN <= r <= GREEN_R_MAX and
                                   GREEN_G_MIN <= g <= GREEN_G_MAX and
                                   GREEN_B_MIN <= b <= GREEN_B_MAX)

                        is_orange = (ORANGE_R_MIN <= r <= ORANGE_R_MAX and
                                    ORANGE_G_MIN <= g <= ORANGE_G_MAX and
                                    ORANGE_B_MIN <= b <= ORANGE_B_MAX)

                        if is_green or is_orange:
                            bar_pixel_count += 1
                            # Calculate height from bottom
                            pixel_height = chart_bottom - y
                            max_bar_height = max(max_bar_height, pixel_height)
                    except:
                        pass

        # Convert pixel height to kWh
        # Y-axis scale: 0-5 kWh (based on screenshot)
        chart_height = chart_bottom - chart_top
        kwh_value = (max_bar_height / chart_height) * 5.0

        # Only include if we found enough pixels (actual bar, not noise)
        if bar_pixel_count > 5:
            daily_values.append({
                'date': f'{year:04d}-{month:02d}-{day:02d}',
                'kwh': round(kwh_value, 1)
            })
        else:
            # No data for this day
            daily_values.append({
                'date': f'{year:04d}-{month:02d}-{day:02d}',
                'kwh': 0
            })

    return daily_values

def main():
    """Main extraction function"""
    all_data = []

    # Get all screenshot files
    screenshot_files = sorted([f for f in os.listdir(SCREENSHOT_DIR) if f.endswith('.png')])

    for filename in screenshot_files:
        year, month = extract_month_from_filename(filename)
        if year and month:
            print(f"Processing {filename} ({year}-{month:02d})...")

            image_path = os.path.join(SCREENSHOT_DIR, filename)
            daily_values = extract_kwh_values(image_path, year, month)

            all_data.extend(daily_values)

            # Print summary for this month
            total_kwh = sum(d['kwh'] for d in daily_values)
            print(f"  → {len(daily_values)} days, {total_kwh:.1f} kWh total")

    # Generate SQL insert statements
    print("\n" + "="*80)
    print("SQL INSERT STATEMENTS:")
    print("="*80 + "\n")

    print("DELETE FROM elwaReadings;")
    print()

    # Filter out days with 0 kWh
    data_with_values = [d for d in all_data if d['kwh'] > 0]

    for data in data_with_values:
        print(f"INSERT OR REPLACE INTO elwaReadings (date, energyKwh, energySolarKwh, energyGridKwh, temp1, temp2, source, notes) VALUES")
        print(f"  ('{data['date']}', {data['kwh']}, {data['kwh']}, 0, NULL, NULL, 'screenshot', NULL);")

    # Print summary
    print("\n" + "="*80)
    print("SUMMARY:")
    print("="*80)
    print(f"Total days with data: {len(data_with_values)}")
    print(f"Total kWh: {sum(d['kwh'] for d in data_with_values):.1f}")
    print(f"Average kWh/day: {sum(d['kwh'] for d in data_with_values) / len(data_with_values):.1f}" if data_with_values else "N/A")

if __name__ == '__main__':
    main()
