/* ============================================================
   BBD CAMPUS NAVIGATOR - SCRIPT.JS
   Pure Vanilla JavaScript (No frameworks, No libraries)
   ============================================================ */

/* ============================================================
   GLOBAL DATA STORE
   Holds parsed JSON data once loading is complete
   ============================================================ */
const appData = {
    students: null,
    classrooms: null,
    timetable: null,
    settings: null
};

/* Flag to ensure search is disabled until all data has loaded */
let isDataReady = false;

/* Expected JSON data file paths */
const DATA_PATHS = {
    students: "data/students.json",
    classrooms: "data/classrooms.json",
    timetable: "data/timetable.json",
    settings: "data/settings.json"
};

/* Weekday names matching JavaScript's Date.getDay() index (0 = Sunday) */
const WEEKDAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];

/* ============================================================
   DOM ELEMENT REFERENCES
   ============================================================ */
const studentNameInput = document.getElementById("studentName");
const mobileNumberInput = document.getElementById("mobileNumber");
const findBtn = document.getElementById("findBtn");

const resultCard = document.getElementById("resultCard");
const welcomeMessageEl = document.getElementById("welcomeMessage");
const statusMessageEl = document.getElementById("statusMessage");
const subjectEl = document.getElementById("subject");
const floorEl = document.getElementById("floor");
const wingEl = document.getElementById("wing");
const roomEl = document.getElementById("room");
const facultyEl = document.getElementById("faculty");

/* ============================================================
   FUNCTION: loadJSONFile
   Fetches a single JSON file and returns parsed data.
   Throws a descriptive error on network or parsing failure.
   ============================================================ */
async function loadJSONFile(filePath) {
    let response;

    try {
        response = await fetch(filePath);
    } catch (networkError) {
        throw new Error(`Network error while fetching "${filePath}": ${networkError.message}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to load "${filePath}" (HTTP status: ${response.status})`);
    }

    try {
        const parsedData = await response.json();
        return parsedData;
    } catch (parseError) {
        throw new Error(`Invalid JSON format in "${filePath}": ${parseError.message}`);
    }
}

/* ============================================================
   FUNCTION: loadData
   Loads all required JSON files in parallel.
   Enables the search button only after all files succeed.
   ============================================================ */
async function loadData() {
    findBtn.disabled = true;

    try {
        const [students, classrooms, timetable, settings] = await Promise.all([
            loadJSONFile(DATA_PATHS.students),
            loadJSONFile(DATA_PATHS.classrooms),
            loadJSONFile(DATA_PATHS.timetable),
            loadJSONFile(DATA_PATHS.settings)
        ]);

        appData.students = students;
        appData.classrooms = classrooms;
        appData.timetable = timetable;
        appData.settings = settings;

        isDataReady = true;
        findBtn.disabled = false;

        console.info("BBD Campus Navigator: All data files loaded successfully.");
    } catch (error) {
        isDataReady = false;
        console.error("BBD Campus Navigator: Failed to load required data.", error);
        alert("Unable to load campus data. Please try again later or contact support.");
    }
}

/* ============================================================
   FUNCTION: validateInputs
   Validates student name and mobile number fields.
   Returns an object: { isValid, errorMessage }
   ============================================================ */
function validateInputs(name, mobile) {
    if (!name || name.trim() === "") {
        return { isValid: false, errorMessage: "Please enter your name." };
    }

    if (!mobile || mobile.trim() === "") {
        return { isValid: false, errorMessage: "Please enter your mobile number." };
    }

    const mobileDigitsOnly = mobile.trim();
    const isExactlyTenDigits = /^\d{10}$/.test(mobileDigitsOnly);

    if (!isExactlyTenDigits) {
        return { isValid: false, errorMessage: "Mobile number must contain exactly 10 digits." };
    }

    return { isValid: true, errorMessage: "" };
}

/* ============================================================
   FUNCTION: findStudent
   Searches students.json for a matching name and mobile number.
   Name comparison is case-insensitive. Returns student object
   or null if no match is found.
   ============================================================ */
function findStudent(name, mobile) {
    if (!Array.isArray(appData.students)) {
        console.error("BBD Campus Navigator: students.json data is missing or malformed.");
        return null;
    }

    const normalizedInputName = name.trim().toLowerCase();
    const normalizedInputMobile = mobile.trim();

    const matchedStudent = appData.students.find((student) => {
        const studentName = (student.name || "").trim().toLowerCase();
        const studentMobile = (student.mobile || "").toString().trim();

        return studentName === normalizedInputName && studentMobile === normalizedInputMobile;
    });

    return matchedStudent || null;
}

/* ============================================================
   FUNCTION: getToday
   Returns the current weekday name (e.g., "Monday").
   ============================================================ */
function getToday() {
    const currentDate = new Date();
    const dayIndex = currentDate.getDay();
    return WEEKDAY_NAMES[dayIndex];
}

/* ============================================================
   FUNCTION: getCurrentTime
   Returns the current local time in 24-hour "HH:MM" format.
   ============================================================ */
function getCurrentTime() {
    const currentDate = new Date();
    const hours = currentDate.getHours().toString().padStart(2, "0");
    const minutes = currentDate.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}

/* ============================================================
   FUNCTION: timeToMinutes
   Converts a "HH:MM" time string into total minutes since
   midnight, for easy numeric comparison.
   ============================================================ */
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    return (hours * 60) + minutes;
}

/* ============================================================
   FUNCTION: findCurrentClass
   Looks through the day's schedule to find a class where the
   current time falls between its start and end times.
   Returns the matching class entry or null.
   ============================================================ */
function findCurrentClass(daySchedule, currentTime) {
    const currentMinutes = timeToMinutes(currentTime);

    const currentClass = daySchedule.find((classEntry) => {
        const startMinutes = timeToMinutes(classEntry.start);
        const endMinutes = timeToMinutes(classEntry.end);
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });

    return currentClass || null;
}

/* ============================================================
   FUNCTION: findUpcomingClass
   Finds the next class scheduled to start after the current
   time. Returns the matching class entry or null.
   ============================================================ */
function findUpcomingClass(daySchedule, currentTime) {
    const currentMinutes = timeToMinutes(currentTime);

    const upcomingClasses = daySchedule
        .filter((classEntry) => timeToMinutes(classEntry.start) > currentMinutes)
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    return upcomingClasses.length > 0 ? upcomingClasses[0] : null;
}

/* ============================================================
   FUNCTION: isWithinLunchBreak
   Checks whether the current time falls within the lunch break
   window defined in settings.json.
   ============================================================ */
function isWithinLunchBreak(currentTime, lunchBreak) {
    if (!lunchBreak || !lunchBreak.start || !lunchBreak.end) {
        return false;
    }

    const currentMinutes = timeToMinutes(currentTime);
    const lunchStartMinutes = timeToMinutes(lunchBreak.start);
    const lunchEndMinutes = timeToMinutes(lunchBreak.end);

    return currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes;
}

/* ============================================================
   FUNCTION: isCollegeOver
   Checks whether the current time is after the college's
   defined end time in settings.json.
   ============================================================ */
function isCollegeOver(currentTime, collegeEndTime) {
    if (!collegeEndTime) {
        return false;
    }

    return timeToMinutes(currentTime) >= timeToMinutes(collegeEndTime);
}

/* ============================================================
   FUNCTION: getRoomDetails
   Searches classrooms.json for a matching room number and
   returns its floor and wing details.
   ============================================================ */
function getRoomDetails(roomNumber) {
    if (!Array.isArray(appData.classrooms)) {
        console.error("BBD Campus Navigator: classrooms.json data is missing or malformed.");
        return null;
    }

    const matchedRoom = appData.classrooms.find((classroom) => {
        return classroom.room && classroom.room.toString() === roomNumber.toString();
    });

    if (!matchedRoom) {
        console.warn(`BBD Campus Navigator: No classroom details found for room "${roomNumber}".`);
        return null;
    }

    return {
        floor: matchedRoom.floor,
        wing: matchedRoom.wing
    };
}

/* ============================================================
   FUNCTION: displayMessage
   Shows the result card and applies only the status message
   along with a CSS status class (defined in style.css).
   Used for cases where classroom details should stay hidden.
   ============================================================ */
function displayMessage(welcomeText, statusText, statusClass) {
    resultCard.hidden = false;

    welcomeMessageEl.textContent = welcomeText;

    statusMessageEl.textContent = statusText;
    statusMessageEl.className = "status-message";
    if (statusClass) {
        statusMessageEl.classList.add(statusClass);
    }

    subjectEl.textContent = "--";
    floorEl.textContent = "--";
    wingEl.textContent = "--";
    roomEl.textContent = "--";
    facultyEl.textContent = "--";
}

/* ============================================================
   FUNCTION: displayResult
   Shows the result card populated with full classroom details
   for a currently running or upcoming class.
   ============================================================ */
function displayResult(welcomeText, statusText, statusClass, classInfo, roomDetails) {
    resultCard.hidden = false;

    welcomeMessageEl.textContent = welcomeText;

    statusMessageEl.textContent = statusText;
    statusMessageEl.className = "status-message";
    if (statusClass) {
        statusMessageEl.classList.add(statusClass);
    }

    subjectEl.textContent = classInfo.subject || "--";
    roomEl.textContent = classInfo.room || "--";
    facultyEl.textContent = classInfo.faculty || "--";

    if (roomDetails) {
        floorEl.textContent = roomDetails.floor || "--";
        wingEl.textContent = roomDetails.wing || "--";
    } else {
        floorEl.textContent = "--";
        wingEl.textContent = "--";
    }
}

/* ============================================================
   FUNCTION: handleFindClass
   Main controller function triggered on button click.
   Orchestrates validation, student lookup, and schedule logic.
   ============================================================ */
function handleFindClass() {
    if (!isDataReady) {
        alert("Campus data is still loading. Please wait a moment and try again.");
        return;
    }

    const enteredName = studentNameInput.value;
    const enteredMobile = mobileNumberInput.value;

    /* Step 1: Validate user inputs */
    const validation = validateInputs(enteredName, enteredMobile);
    if (!validation.isValid) {
        alert(validation.errorMessage);
        return;
    }

    /* Step 2: Verify student exists */
    const student = findStudent(enteredName, enteredMobile);
    if (!student) {
        displayMessage("", "Student Not Found", "status-error");
        console.warn("BBD Campus Navigator: No matching student found for provided credentials.");
        return;
    }

    const welcomeText = `Welcome, ${student.name}`;
    const studentSection = student.section;

    /* Step 3: Determine current day and time */
    const today = getToday();
    const currentTime = getCurrentTime();

    /* Step 4: Holiday check (Sunday) */
    if (today === "Sunday") {
        displayMessage(welcomeText, "Today is Holiday", "status-holiday");
        return;
    }

    /* Step 5: Validate timetable data structure */
    if (!appData.timetable || typeof appData.timetable !== "object") {
        console.error("BBD Campus Navigator: timetable.json data is missing or malformed.");
        displayMessage(welcomeText, "No Classes Today", "status-warning");
        return;
    }

    const sectionSchedule = appData.timetable[studentSection];
    if (!sectionSchedule) {
        console.error(`BBD Campus Navigator: No timetable found for section "${studentSection}".`);
        displayMessage(welcomeText, "No Classes Today", "status-warning");
        return;
    }

    const todaySchedule = sectionSchedule[today];

    /* Step 6: No classes scheduled today */
    if (!Array.isArray(todaySchedule) || todaySchedule.length === 0) {
        displayMessage(welcomeText, "No Classes Today", "status-warning");
        return;
    }

    /* Step 7: Check if college hours are over for the day */
    const settings = appData.settings || {};
    if (isCollegeOver(currentTime, settings.collegeEndTime)) {
        displayMessage(welcomeText, "Today's Classes are Over", "status-college-over");
        return;
    }

    /* Step 8: Check if current time falls within lunch break */
    if (isWithinLunchBreak(currentTime, settings.lunchBreak)) {
        const upcomingClass = findUpcomingClass(todaySchedule, currentTime);

        if (upcomingClass) {
            const roomDetails = getRoomDetails(upcomingClass.room);
            displayResult(welcomeText, "Lunch Break", "status-warning", upcomingClass, roomDetails);
        } else {
            displayMessage(welcomeText, "Lunch Break", "status-warning");
        }
        return;
    }

    /* Step 9: Look for a currently running class */
    const currentClass = findCurrentClass(todaySchedule, currentTime);
    if (currentClass) {
        const roomDetails = getRoomDetails(currentClass.room);
        displayResult(welcomeText, "Current Class", "status-current-class", currentClass, roomDetails);
        return;
    }

    /* Step 10: No current class - check for an upcoming class within 30 minutes */
    const upcomingClass = findUpcomingClass(todaySchedule, currentTime);
    if (upcomingClass) {
        const currentMinutes = timeToMinutes(currentTime);
        const upcomingStartMinutes = timeToMinutes(upcomingClass.start);
        const minutesUntilNextClass = upcomingStartMinutes - currentMinutes;

        if (minutesUntilNextClass <= 30) {
            const roomDetails = getRoomDetails(upcomingClass.room);
            displayResult(welcomeText, "Upcoming Class", "status-upcoming-class", upcomingClass, roomDetails);
            return;
        }
    }

    /* Step 11: No current or imminent upcoming class */
    displayMessage(welcomeText, "No Current Class", "status-warning");
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
findBtn.addEventListener("click", handleFindClass);

/* ============================================================
   INITIALIZATION
   Load all required JSON data as soon as the script runs.
   ============================================================ */
loadData();