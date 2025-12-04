/*
 * SCORM API Wrapper for JavaScript
 *
 * Author: Tony Giang
 * Date: 2023-11-14
 * Version: 1.0
 *
 * Description:
 * This file provides a JavaScript wrapper for interacting with the SCORM API.
 * It supports SCORM 1.2.
 *
 * Usage:
 * 1. Include this file in your HTML page.
 * 2. Call scorm.init() to initialize the API.
 * 3. Use the provided functions to interact with the SCORM API.
 * 4. Call scorm.quit() to terminate the API connection.
 */

var scorm = {
    version: "1.2",
    API: null,
    isConnected: false,

    findAPI: function(win) {
        var attempts = 0;
        while ((!win.API) && (win.parent) && (win.parent != win) && (attempts <= 7)) {
            attempts++;
            win = win.parent;
        }
        return win.API;
    },

    getAPI: function() {
        var API = this.findAPI(window);
        if ((!API) && (typeof (GetAPI) != "undefined") && (GetAPI != null)) {
            API = GetAPI();
        }
        return API;
    },

    init: function() {
        this.API = this.getAPI();
        if (!this.API) {
            console.error("SCORM API not found.");
            return false;
        }

        try {
            var result = this.API.LMSInitialize("");
            if (result == "true") {
                this.isConnected = true;
                console.log("SCORM API initialized.");
                return true;
            } else {
                console.error("LMSInitialize failed: " + this.API.LMSGetErrorString(this.API.LMSGetLastError()));
                return false;
            }
        } catch (e) {
            console.error("Error initializing SCORM API: " + e.message);
            return false;
        }
    },

    quit: function() {
        if (!this.isConnected) {
            console.warn("SCORM API is not connected.");
            return true;
        }

        try {
            var result = this.API.LMSFinish("");
            if (result == "true") {
                this.isConnected = false;
                console.log("SCORM API terminated.");
                return true;
            } else {
                console.error("LMSFinish failed: " + this.API.LMSGetErrorString(this.API.LMSGetLastError()));
                return false;
            }
        } catch (e) {
            console.error("Error terminating SCORM API: " + e.message);
            return false;
        }
    },

    getValue: function(name) {
        if (!this.isConnected) {
            console.warn("SCORM API is not connected.");
            return null;
        }

        try {
            var value = this.API.LMSGetValue(name);
            if (this.API.LMSGetLastError() != "0") {
                console.error("LMSGetValue(" + name + ") failed: " + this.API.LMSGetErrorString(this.API.LMSGetLastError()));
                return null;
            } else {
                return value;
            }
        } catch (e) {
            console.error("Error getting SCORM value: " + e.message);
            return null;
        }
    },

    setValue: function(name, value) {
        if (!this.isConnected) {
            console.warn("SCORM API is not connected.");
            return false;
        }

        try {
            var result = this.API.LMSSetValue(name, value);
            if (result == "true") {
                return true;
            } else {
                console.error("LMSSetValue(" + name + ", " + value + ") failed: " + this.API.LMSGetErrorString(this.API.LMSGetLastError()));
                return false;
            }
        } catch (e) {
            console.error("Error setting SCORM value: " + e.message);
            return false;
        }
    },

    setScore: function(raw, max, min) {
        if (!this.isConnected) {
            console.warn("SCORM API is not connected.");
            return false;
        }

        try {
            var result = this.setValue("cmi.core.score.raw", raw);
            result = result && this.setValue("cmi.core.score.max", max);
            result = result && this.setValue("cmi.core.score.min", min);

            if (result) {
                console.log("Score set successfully: raw=" + raw + ", max=" + max + ", min=" + min);
                return true;
            } else {
                console.error("Failed to set score.");
                return false;
            }
        } catch (e) {
            console.error("Error setting score: " + e.message);
            return false;
        }
    },

    setCompleted: function() {
        if (!this.isConnected) {
            console.warn("SCORM API is not connected.");
            return false;
        }

        try {
            var result = this.setValue("cmi.core.lesson_status", "completed");
            if (result) {
                console.log("Lesson status set to completed.");
                return true;
            } else {
                console.error("Failed to set lesson status to completed.");
                return false;
            }
        } catch (e) {
            console.error("Error setting lesson status: " + e.message);
            return false;
        }
    },

    setPassed: function() {
         if (!this.isConnected) {
            console.warn("SCORM API is not connected.");
            return false;
        }

        try {
            var result = this.setValue("cmi.core.lesson_status", "passed");
            if (result) {
                console.log("Lesson status set to passed.");
                return true;
            } else {
                console.error("Failed to set lesson status to passed.");
                return false;
            }
        } catch (e) {
            console.error("Error setting lesson status: " + e.message);
            return false;
        }
    },

    setFailed: function() {
         if (!this.isConnected) {
            console.warn("SCORM API is not connected.");
            return false;
        }

        try {
            var result = this.setValue("cmi.core.lesson_status", "failed");
            if (result) {
                console.log("Lesson status set to failed.");
                return true;
            } else {
                console.error("Failed to set lesson status to failed.");
                return false;
            }
        } catch (e) {
            console.error("Error setting lesson status: " + e.message);
            return false;
        }
    },

    // Additional functions for specific SCORM interactions can be added here
    // For example, tracking interactions, setting learner name, etc.

    // Example: Setting learner name
    setLearnerName: function(name) {
        if (!this.isConnected) {
            console.warn("SCORM API is not connected.");
            return false;
        }

        try {
            var result = this.setValue("cmi.core.student_name", name);
            if (result) {
                console.log("Learner name set to: " + name);
                return true;
            } else {
                console.error("Failed to set learner name.");
                return false;
            }
        } catch (e) {
            console.error("Error setting learner name: " + e.message);
            return false;
        }
    },

    // Example: Tracking an interaction
    trackInteraction: function(id, type, correctResponses, weighting, learnerResponse, result, latency, description) {
        if (!this.isConnected) {
            console.warn("SCORM API is not connected.");
            return false;
        }

        try {
            var interactionIndex = this.getValue("cmi.interactions._count");
            if (interactionIndex === null) {
                interactionIndex = 0;
            } else {
                interactionIndex = parseInt(interactionIndex);
            }

            var interactionPrefix = "cmi.interactions." + interactionIndex + ".";

            var result = this.setValue(interactionPrefix + "id", id);
            result = result && this.setValue(interactionPrefix + "type", type);
            
            if (correctResponses && correctResponses.length > 0) {
                for (var i = 0; i < correctResponses.length; i++) {
                    result = result && this.setValue(interactionPrefix + "correct_responses." + i + ".pattern", correctResponses[i]);
                }
            }

            result = result && this.setValue(interactionPrefix + "weighting", weighting);
            result = result && this.setValue(interactionPrefix + "learner_response", learnerResponse);
            result = result && this.setValue(interactionPrefix + "result", result);
            result = result && this.setValue(interactionPrefix + "latency", latency);
            result = result && this.setValue(interactionPrefix + "description", description);

            if (result) {
                this.setValue("cmi.interactions._count", interactionIndex + 1);
                console.log("Interaction tracked successfully.");
                return true;
            } else {
                console.error("Failed to track interaction.");
                return false;
            }
        } catch (e) {
            console.error("Error tracking interaction: " + e.message);
            return false;
        }
    },

     // Function to handle errors
    handleSCORMError: function() {
        if (this.isConnected) {
            var errCode = this.API.LMSGetLastError();
            if (errCode !== "0") {
                var errString = this.API.LMSGetErrorString(errCode);
                var diagString = this.API.LMSGetDiagnostic(errCode);

                console.error("SCORM Error Code: " + errCode + "\nError Description: " + errString + "\nDiagnostic Information: " + diagString);
            }
        } else {
            console.warn("SCORM API is not connected, cannot retrieve error information.");
        }
    },

    // Function to commit data
    commitData: function() {
        if (this.isConnected) {
            var result = this.API.LMSCommit("");
            if (result === "true") {
                console.log("Data committed successfully.");
                return true;
            } else {
                console.error("LMSCommit failed: " + this.API.LMSGetErrorString(this.API.LMSGetLastError()));
                return false;
            }
        } else {
            console.warn("SCORM API is not connected, cannot commit data.");
            return false;
        }
    }
};