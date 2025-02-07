const moment = require("moment");

/** Convert 12-hour format (hh:mm A) to 24-hour format (HH:mm:ss) */
function convertTo24HourFormat(time) {
    // console.log(time);
    return moment(time, ["hh:mm A"]).format("HH:mm:ss");
}


function convertTo12HourFormat(time) {
    // Split the time into hours and minutes
    let [hours, minutes] = time.split(":").map(Number);
    
    // Determine AM or PM
    const amPm = hours >= 12 ? "PM" : "AM";
  
    // Convert hours to 12-hour format
    hours = hours % 12 || 12; // Convert 0 to 12 for midnight and 12-hour format
  
    // Return the formatted time with AM/PM
    return `${hours}:${minutes.toString().padStart(2, "0")} ${amPm}`;
  }

module.exports = { convertTo24HourFormat, convertTo12HourFormat };


