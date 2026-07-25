/**
 * ============================================================================
 * BBD Campus Navigator - Core Application Engine
 * System: Smart Classroom Navigation System
 * Author: Suraj Kumar Mishra
 * Year: 2026
 * 
 * Description:
 * Modern Vanilla JS application providing real-time classroom navigation,
 * schedule checks, and next-class detection for university students.
 * ============================================================================
 */

"use strict";

/**
 * Global Application State
 * Stores fetched data in memory to ensure zero redundant network calls.
 */
const AppState = {
  students: [],
  classrooms: [],
  timetable: {},
  settings: {},
  isLoaded: false,
};

/**
 * Working Days Array Configuration
 */
const WORKING_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Cached DOM Element References
 */
const DOM = {};

/* ============================================================================
 * 1. INITIALIZATION & DATA LOADING
 * ============================================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  initDOMReferences();
  setupEventListeners();

  try {
    await loadData();
    AppState.isLoaded = true;
    console.info("BBD Campus Navigator: All system data loaded successfully.");
  } catch (error) {
    console.error("BBD Campus Navigator: Critical initialization error:", error);
    alert("Failed to load application data. Please check your network connection.");
  }
});

/**
 * Caches all required DOM elements by ID.
 */
function initDOMReferences() {
  DOM.studentName = document.getElementById("studentName");
  DOM.mobileNumber = document.getElementById("mobileNumber");
  DOM.findBtn = document.getElementById("findBtn");
  DOM.nextClassBtn = document.getElementById("nextClassBtn");
  DOM.selectedDay = document.getElementById("selectedDay");
  DOM.selectedTime = document.getElementById("selectedTime");
  DOM.checkScheduleBtn = document.getElementById("checkScheduleBtn");
  DOM.resultCard = document.getElementById("resultCard");
  DOM.welcomeMessage = document.getElementById("welcomeMessage");
  DOM.statusMessage = document.getElementById("statusMessage");
  DOM.subject = document.getElementById("subject");
  DOM.floor = document.getElementById("floor");
  DOM.wing = document.getElementById("wing");
  DOM.room = document.getElementById("room");
  DOM.faculty = document.getElementById("faculty");
}

/**
 * Fetches all JSON data files concurrently using Promise.all().
 */
async function loadData() {
  const [studentsRes, classroomsRes, timetableRes, settingsRes] =
    await Promise.all([
      fetch("data/students.json"),
      fetch("data/classrooms.json"),
      fetch("data/timetable.json"),
      fetch("data/settings.json"),
    ]);

  if (
    !studentsRes.ok ||
    !classroomsRes.ok ||
    !timetableRes.ok ||
    !settingsRes.ok
  ) {
    throw new Error("One or more data files failed to load.");
  }

  AppState.students = await studentsRes.json();
  AppState.classrooms = await classroomsRes.json();
  AppState.timetable = await timetableRes.json();
  AppState.settings = await settingsRes.json();
}

/**
 * Binds UI Event Listeners including accessibility handlers.
 */
function setupEventListeners() {
  if (DOM.findBtn) {
    DOM.findBtn.addEventListener("click", handleFindMyClass);
  }

  if (DOM.nextClassBtn) {
    DOM.nextClassBtn.addEventListener("click", handleFindNextClass);
  }

  if (DOM.checkScheduleBtn) {
    DOM.checkScheduleBtn.addEventListener("click", handleCheckSchedule);
  }

  // Keyboard Accessibility: Trigger 'Find My Class' on Enter key press in form fields
  const handleEnterKey = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleFindMyClass();
    }
  };

  if (DOM.studentName) {
    DOM.studentName.addEventListener("keydown", handleEnterKey);
  }
  if (DOM.mobileNumber) {
    DOM.mobileNumber.addEventListener("keydown", handleEnterKey);
  }
}

/* ============================================================================
 * 2. VALIDATION & STUDENT VERIFICATION
 * ============================================================================ */

/**
 * Validates form inputs and searches for a matching student record.
 * @returns {Object|null} Student object if verified, null otherwise.
 */
function validateAndGetStudent() {
  if (!AppState.isLoaded) {
    alert("Data is still loading. Please try again in a moment.");
    return null;
  }

  const rawName = DOM.studentName ? DOM.studentName.value : "";
  const rawMobile = DOM.mobileNumber ? DOM.mobileNumber.value : "";

  const name = rawName.trim();
  const mobile = rawMobile.trim();

  // Validate Name
  if (!name) {
    alert("Please enter your name.");
    if (DOM.studentName) DOM.studentName.focus();
    return null;
  }

  // Validate Mobile Number (Must be exactly 10 digits)
  const mobileRegex = /^\d{10}$/;
  if (!mobile || !mobileRegex.test(mobile)) {
    alert("Please enter a valid 10-digit mobile number.");
    if (DOM.mobileNumber) DOM.mobileNumber.focus();
    return null;
  }

  // Authenticate / Find Student
  const student = findStudent(name, mobile);

  if (!student) {
    showErrorStatus(`Welcome ${name}`, "Student Not Found");
    return null;
  }

  return student;
}

/**
 * Performs case-insensitive name and exact mobile matching.
 * @param {string} name 
 * @param {string} mobile 
 * @returns {Object|undefined}
 */
function findStudent(name, mobile) {
  const cleanName = name.toLowerCase();
  return AppState.students.find((s) => {
    const studentNameMatch =
      s.name && s.name.trim().toLowerCase() === cleanName;
    const studentMobileMatch =
      s.mobile && String(s.mobile).trim() === mobile;
    return studentNameMatch && studentMobileMatch;
  });
}

/* ============================================================================
 * 3. TIME & CALENDAR UTILITIES
 * ============================================================================ */

/**
 * Returns the current day name (e.g., "Monday").
 * @returns {string}
 */
function getCurrentDay() {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const todayIndex = new Date().getDay();
  return days[todayIndex];
}

/**
 * Returns current time in 24-hour HH:MM format.
 * @returns {string}
 */
function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Converts "HH:MM" time string into total minutes from midnight for easy comparison.
 * @param {string} timeStr 
 * @returns {number}
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculates time difference in minutes between two "HH:MM" strings.
 * @param {string} start 
 * @param {string} end 
 * @returns {number}
 */
function getMinutesDiff(start, end) {
  return timeToMinutes(end) - timeToMinutes(start);
}

/* ============================================================================
 * 4. EVENT HANDLERS
 * ============================================================================ */

/**
 * Handles 'Find My Class' button action.
 */
function handleFindMyClass() {
  const student = validateAndGetStudent();
  if (!student) return;

  const currentDay = getCurrentDay();
  const currentTime = getCurrentTime();

  // Check if today is a holiday (Sunday)
  if (currentDay === "Sunday" || !WORKING_DAYS.includes(currentDay)) {
    showErrorStatus(`Welcome ${student.name}`, "Today is Holiday");
    return;
  }

  // Check if college hours are over
  const collegeEndTime = AppState.settings.collegeEndTime || "17:00";
  if (timeToMinutes(currentTime) >= timeToMinutes(collegeEndTime)) {
    showErrorStatus(`Welcome ${student.name}`, "Today's Classes are Over");
    return;
  }

  // Find class running right now or upcoming
  const daySchedule = getSectionSchedule(student.section, currentDay);

  if (!daySchedule || daySchedule.length === 0) {
    showErrorStatus(`Welcome ${student.name}`, "No Current Class");
    return;
  }

  const currentMinutes = timeToMinutes(currentTime);

  // 1. Check for Current Class
  const currentSlot = daySchedule.find((slot) => {
    const startMin = timeToMinutes(slot.start);
    const endMin = timeToMinutes(slot.end);
    return currentMinutes >= startMin && currentMinutes < endMin;
  });

  if (currentSlot) {
    if (currentSlot.isLunch) {
      // If currently in Lunch Break, find the class following lunch
      const nextSlotAfterLunch = daySchedule.find(
        (s) => timeToMinutes(s.start) >= timeToMinutes(currentSlot.end) && !s.isLunch
      );
      if (nextSlotAfterLunch) {
        displayResult(student, "Lunch Break", nextSlotAfterLunch);
      } else {
        showErrorStatus(`Welcome ${student.name}`, "Lunch Break");
      }
      return;
    }

    displayResult(student, "Current Class", currentSlot);
    return;
  }

  // 2. Check for Upcoming Class (Starting within 30 minutes)
  const upcomingSlot = daySchedule.find((slot) => {
    const startMin = timeToMinutes(slot.start);
    const diff = startMin - currentMinutes;
    return diff > 0 && diff <= 30 && !slot.isLunch;
  });

  if (upcomingSlot) {
    displayResult(student, "Upcoming Class", upcomingSlot);
    return;
  }

  // 3. Fallback: If before first class or in a break gap
  const nextSlot = daySchedule.find(
    (slot) => timeToMinutes(slot.start) > currentMinutes && !slot.isLunch
  );

  if (nextSlot) {
    displayResult(student, "Next Class", nextSlot);
  } else {
    showErrorStatus(`Welcome ${student.name}`, "Today's Classes are Over");
  }
}

/**
 * Handles 'Find My Next Class' button action.
 */
function handleFindNextClass() {
  const student = validateAndGetStudent();
  if (!student) return;

  const currentDay = getCurrentDay();
  const currentTime = getCurrentTime();

  // If Holiday or College Over -> Get first class of next working day
  if (
    currentDay === "Sunday" ||
    timeToMinutes(currentTime) >= timeToMinutes(AppState.settings.collegeEndTime || "17:00")
  ) {
    const nextWorkingDay = getNextWorkingDay(currentDay);
    const nextDaySchedule = getSectionSchedule(student.section, nextWorkingDay);
    const firstClass = nextDaySchedule.find((s) => !s.isLunch);

    if (firstClass) {
      displayResult(student, `Next Class (${nextWorkingDay})`, firstClass);
    } else {
      showErrorStatus(`Welcome ${student.name}`, "No Classes Found");
    }
    return;
  }

  const daySchedule = getSectionSchedule(student.section, currentDay);
  const currentMinutes = timeToMinutes(currentTime);

  // Find immediate next class after current time
  const nextClass = daySchedule.find(
    (slot) => timeToMinutes(slot.start) >= currentMinutes && !slot.isLunch
  );

  if (nextClass) {
    displayResult(student, "Next Class", nextClass);
  } else {
    // If no more classes today -> show first class of next working day
    const nextWorkingDay = getNextWorkingDay(currentDay);
    const nextDaySchedule = getSectionSchedule(student.section, nextWorkingDay);
    const firstClass = nextDaySchedule.find((s) => !s.isLunch);

    if (firstClass) {
      displayResult(student, `Next Class (${nextWorkingDay})`, firstClass);
    } else {
      showErrorStatus(`Welcome ${student.name}`, "Today's Classes are Over");
    }
  }
}

/**
 * Handles 'Check Schedule' collapsible form submit.
 */
function handleCheckSchedule() {
  const student = validateAndGetStudent();
  if (!student) return;

  const selectedDay = DOM.selectedDay ? DOM.selectedDay.value : "";
  const selectedTime = DOM.selectedTime ? DOM.selectedTime.value : "";

  if (!selectedDay) {
    alert("Please select a day from the schedule options.");
    return;
  }

  if (!selectedTime) {
    alert("Please select a time from the schedule options.");
    return;
  }

  if (selectedDay === "Sunday") {
    showErrorStatus(`Welcome ${student.name}`, "Today is Holiday");
    return;
  }

  const daySchedule = getSectionSchedule(student.section, selectedDay);
  if (!daySchedule || daySchedule.length === 0) {
    showErrorStatus(`Welcome ${student.name}`, "No Current Class");
    return;
  }

  const selectedMinutes = timeToMinutes(selectedTime);

  // Find slot active at selected day and time
  const targetSlot = daySchedule.find((slot) => {
    const startMin = timeToMinutes(slot.start);
    const endMin = timeToMinutes(slot.end);
    return selectedMinutes >= startMin && selectedMinutes < endMin;
  });

  if (!targetSlot) {
    showErrorStatus(`Welcome ${student.name}`, "No Class Scheduled At This Time");
    return;
  }

  if (targetSlot.isLunch) {
    const nextClass = daySchedule.find(
      (s) => timeToMinutes(s.start) >= timeToMinutes(targetSlot.end) && !s.isLunch
    );
    if (nextClass) {
      displayResult(student, "Lunch Break", nextClass);
    } else {
      showErrorStatus(`Welcome ${student.name}`, "Lunch Break");
    }
    return;
  }

  displayResult(student, "Selected Schedule", targetSlot);
}

/* ============================================================================
 * 5. CORE LOGIC HELPERS
 * ============================================================================ */

/**
 * Retrieves timetable schedule for a given section and day.
 * Scalable for any section (e.g. 2A, 2B, 2C, 3A).
 * @param {string} section 
 * @param {string} day 
 * @returns {Array}
 */
function getSectionSchedule(section, day) {
  if (!AppState.timetable || !AppState.timetable[section]) {
    return [];
  }
  return AppState.timetable[section][day] || [];
}

/**
 * Resolves room number to floor and wing details from classrooms.json data.
 * @param {string} roomNumber 
 * @returns {Object}
 */
function mapRoom(roomNumber) {
  if (!AppState.classrooms || !roomNumber) {
    return { floor: "N/A", wing: "N/A" };
  }

  // Handle both array and key-value mapping formats
  if (Array.isArray(AppState.classrooms)) {
    const roomObj = AppState.classrooms.find(
      (c) => String(c.room) === String(roomNumber)
    );
    return roomObj
      ? { floor: roomObj.floor || "N/A", wing: roomObj.wing || "N/A" }
      : { floor: "N/A", wing: "N/A" };
  } else if (typeof AppState.classrooms === "object") {
    const roomObj = AppState.classrooms[roomNumber];
    return roomObj
      ? { floor: roomObj.floor || "N/A", wing: roomObj.wing || "N/A" }
      : { floor: "N/A", wing: "N/A" };
  }

  return { floor: "N/A", wing: "N/A" };
}

/**
 * Computes the next logical working day name.
 * @param {string} currentDay 
 * @returns {string}
 */
function getNextWorkingDay(currentDay) {
  if (currentDay === "Saturday" || currentDay === "Sunday") {
    return "Monday";
  }
  const currentIndex = WORKING_DAYS.indexOf(currentDay);
  if (currentIndex !== -1 && currentIndex < WORKING_DAYS.length - 1) {
    return WORKING_DAYS[currentIndex + 1];
  }
  return "Monday";
}

/* ============================================================================
 * 6. UI RENDER & DISPLAY ENGINE
 * ============================================================================ */

/**
 * Renders complete verified class result details into the DOM.
 * @param {Object} student 
 * @param {string} status 
 * @param {Object} classInfo 
 */
function displayResult(student, status, classInfo) {
  if (!DOM.resultCard) return;

  const roomInfo = mapRoom(classInfo.room);

  // Update Header & Status
  if (DOM.welcomeMessage) {
    DOM.welcomeMessage.textContent = `Welcome ${student.name}`;
  }
  if (DOM.statusMessage) {
    DOM.statusMessage.textContent = status;
    applyStatusBadgeStyle(DOM.statusMessage, status);
  }

  // Update Information List
  if (DOM.subject) DOM.subject.textContent = classInfo.subject || "N/A";
  if (DOM.floor) DOM.floor.textContent = roomInfo.floor || "N/A";
  if (DOM.wing) DOM.wing.textContent = roomInfo.wing || "N/A";
  if (DOM.room) DOM.room.textContent = classInfo.room || "N/A";
  if (DOM.faculty) DOM.faculty.textContent = classInfo.faculty || "N/A";

  // Show Result Card
  DOM.resultCard.hidden = false;
  DOM.resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/**
 * Handles error/negative status states (e.g., Student Not Found, Holiday).
 * Clears class details and displays appropriate message.
 * @param {string} welcomeText 
 * @param {string} statusText 
 */
function showErrorStatus(welcomeText, statusText) {
  if (!DOM.resultCard) return;

  if (DOM.welcomeMessage) DOM.welcomeMessage.textContent = welcomeText;
  if (DOM.statusMessage) {
    DOM.statusMessage.textContent = statusText;
    applyStatusBadgeStyle(DOM.statusMessage, statusText);
  }

  // Reset/Clear class details
  if (DOM.subject) DOM.subject.textContent = "--";
  if (DOM.floor) DOM.floor.textContent = "--";
  if (DOM.wing) DOM.wing.textContent = "--";
  if (DOM.room) DOM.room.textContent = "--";
  if (DOM.faculty) DOM.faculty.textContent = "--";

  DOM.resultCard.hidden = false;
  DOM.resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/**
 * Helper to dynamically assign badge modifier classes for CSS status styling.
 * @param {HTMLElement} badgeElem 
 * @param {string} status 
 */
function applyStatusBadgeStyle(badgeElem, status) {
  badgeElem.className = "status-badge"; // Reset classes

  const statusLower = status.toLowerCase();

  if (statusLower.includes("current")) {
    badgeElem.classList.add("current-class");
    badgeElem.setAttribute("data-status", "current");
  } else if (statusLower.includes("upcoming") || statusLower.includes("next")) {
    badgeElem.classList.add("upcoming-class");
    badgeElem.setAttribute("data-status", "upcoming");
  } else if (statusLower.includes("lunch")) {
    badgeElem.classList.add("lunch-break");
    badgeElem.setAttribute("data-status", "lunch");
  } else if (statusLower.includes("holiday") || statusLower.includes("over")) {
    badgeElem.classList.add("classes-over");
    badgeElem.setAttribute("data-status", "over");
  } else if (statusLower.includes("not found")) {
    badgeElem.classList.add("not-found");
    badgeElem.setAttribute("data-status", "not-found");
  } else if (statusLower.includes("selected")) {
    badgeElem.classList.add("selected-schedule");
    badgeElem.setAttribute("data-status", "selected");
  } else {
    badgeElem.classList.add("classes-over");
  }
}

/**
 * Clears and hides the result card completely.
 */
function clearResult() {
  if (DOM.resultCard) {
    DOM.resultCard.hidden = true;
  }
}