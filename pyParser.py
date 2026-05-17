#!./env/bin/python
import sys
from bs4 import BeautifulSoup
import subprocess
import datetime
try:
    htmlFile = sys.argv[1]
except:
    sys.exit()
if htmlFile == "CLEARMODE": 
    applescriptDELETER = f'''
tell application "Calendar"
    set targetCalendar to calendar "School"
    delete every event of targetCalendar
end tell
'''
    deleteResult = subprocess.run(["osascript","-e",applescriptDELETER],capture_output=True,text=True)
    sys.exit()
else: pass
html = open(htmlFile,"r")
soup = BeautifulSoup(html,'html.parser')
html.close()
eventArr = []
for element in soup.find_all('td'):
    save = True
    if element.find('div',class_="text") != None:
        if element.find('div',class_="text").find('b') != None:
            if "wolny" in str(element.find('div').text):
                save = False
            if len(element.find_all('div',class_="text")) > 1:
                divText = element.find_all('div',class_="text")[-1]
            else:
                divText = element.find('div',class_="text")
                if len(element.find_all('s'))>0: save = False
            date = element['data-date']
            startHour = element['data-time_from']
            endHour = element['data-time_to']
            lessonName = divText.find('b').string.replace("\n","").strip()
            try:
                roomNum = int(divText.text.split("\xa0")[-1])
            except:
                roomNum = None

            newEvent = {"lessonName":lessonName,"room":roomNum,"date":date,"start":startHour,"end":endHour}
            if save:
                eventArr.append(newEvent)
with open("parsed_data","w") as parsedFile:
    for event in eventArr:
        parsedFile.write(f"{str(event)}\n")
calendarName = "School"

for event in eventArr:
    name = event['lessonName']
    room = event['room'] if event['room'] else "Unknown"
    
    # Ensure the date format matches what macOS expects
    # Example: "2024-05-20" and "08:00" -> "05/20/2024 08:00"
    # Adjust the strptime format based on your HTML's actual data-date format
    start_dt = datetime.datetime.strptime(f"{event['date']} {event['start']}", "%Y-%m-%d %H:%M")
    end_dt = datetime.datetime.strptime(f"{event['date']} {event['end']}", "%Y-%m-%d %H:%M")

    # Format specifically for AppleScript (MM/DD/YYYY HH:MM:SS)
    as_start = start_dt.strftime("%d/%m/%Y %H:%M:%S")
    as_end = end_dt.strftime("%d/%m/%Y %H:%M:%S")
    print(as_end)
    applescript = f'''
    tell application "Calendar"
        tell calendar "{calendarName}"
            make new event with properties {{summary:"{name}", location:"Room {room}", start date:date "{as_start}", end date:date "{as_end}"}}
        end tell
    end tell
    '''
    result = subprocess.run(["osascript", "-e", applescript], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error adding {name}: {result.stderr}")
print(f"{len(eventArr)}",end="")
sys.stdout.flush()