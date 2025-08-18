// SypnexAPI Scaling - Centralized scaling utilities for all apps
// This file extends the SypnexAPI class with robust scaling compensation utilities
//
// This module provides a centralized solution for handling app scaling across all user applications.
// Previously, scaling utilities were duplicated in multiple places (utils, file explorer utils).
// Now all apps can access these utilities via sypnexAPI.scaling or the convenience methods.
//
// Key features:
// - Detects app scale from CSS classes or transform matrix
// - Provides coordinate transformation utilities
// - Handles mouse coordinate scaling
// - Includes element bounding rect scaling
// - Supports optional zoom scaling for canvas-based apps
// - Auto-detects scale changes with callback support
//
// Usage examples:
//   sypnexAPI.scaling.detectAppScale()
//   sypnexAPI.getScaledMouseCoords(event)
//   sypnexAPI.getScaledBoundingClientRect(element)
//   sypnexAPI.screenToAppCoords(x, y, zoomScale)

/**
 * Scaling utilities for handling app scaling across all user applications
 * Provides methods to handle coordinate transformations, element positioning,
 * and mouse interactions when apps are scaled by the OS
 * @namespace
 */
const scalingUtils = {
    // Internal scale cache
    _appScale: 1.0,

    /**
     * Detect the current app scale from CSS transform
     * @returns {number} Scale factor (1.0 = 100%, 0.8 = 80%, etc.)
     */
    detectAppScale() {
        try {
            // Find the app window container
            const appWindow = document.querySelector('.app-window');
            if (!appWindow) {
                return 1.0;
            }

            // Check for scale classes
            const scaleClasses = ['scale-75', 'scale-80', 'scale-85', 'scale-90', 'scale-95',
                'scale-100', 'scale-105', 'scale-110', 'scale-115', 'scale-120',
                'scale-125', 'scale-130', 'scale-135', 'scale-140', 'scale-145', 'scale-150'];

            for (const scaleClass of scaleClasses) {
                if (appWindow.classList.contains(scaleClass)) {
                    const scaleValue = parseInt(scaleClass.replace('scale-', ''));
                    this._appScale = scaleValue / 100;
                    return this._appScale;
                }
            }

            // Fallback: check computed transform
            const computedStyle = window.getComputedStyle(appWindow);
            const transform = computedStyle.transform;
            if (transform && transform !== 'none') {
                // Parse transform matrix to extract scale
                const matrix = transform.match(/matrix\(([^)]+)\)/);
                if (matrix) {
                    const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
                    if (values.length >= 4) {
                        // Matrix format: matrix(a, b, c, d, tx, ty) where a and d are scale factors
                        const scaleX = values[0];
                        const scaleY = values[3];
                        this._appScale = (scaleX + scaleY) / 2; // Average of X and Y scale
                        return this._appScale;
                    }
                }
            }

            this._appScale = 1.0;
            return 1.0;
        } catch (error) {
            console.error('Error detecting app scale:', error);
            this._appScale = 1.0;
            return 1.0;
        }
    },

    /**
     * Get the total effective scale (app scale × optional zoom scale)
     * @param {number} [zoomScale=1.0] - Optional zoom scale to combine with app scale
     * @returns {number} Combined scale factor
     */
    getEffectiveScale(zoomScale = 1.0) {
        const appScale = this.detectAppScale();
        return appScale * zoomScale;
    },

    /**
     * Convert screen coordinates to app coordinates (accounting for app scale and optional zoom)
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {number} [zoomScale=1.0] - Optional zoom scale
     * @returns {object} Object with x and y properties in app coordinates
     */
    screenToAppCoords(screenX, screenY, zoomScale = 1.0) {
        const scale = this.getEffectiveScale(zoomScale);
        return {
            x: screenX / scale,
            y: screenY / scale
        };
    },

    /**
     * Convert app coordinates to screen coordinates (accounting for app scale and optional zoom)
     * @param {number} appX - App X coordinate
     * @param {number} appY - App Y coordinate
     * @param {number} [zoomScale=1.0] - Optional zoom scale
     * @returns {object} Object with x and y properties in screen coordinates
     */
    appToScreenCoords(appX, appY, zoomScale = 1.0) {
        const scale = this.getEffectiveScale(zoomScale);
        return {
            x: appX * scale,
            y: appY * scale
        };
    },

    /**
     * Get scaled element bounding rectangle (compensates for app scaling)
     * @param {Element} element - DOM element to get bounds for
     * @returns {object} DOMRect-like object with scaled coordinates
     */
    getScaledBoundingClientRect(element) {
        const rect = element.getBoundingClientRect();
        const appScale = this.detectAppScale();
        // Note: Don't include zoom scale here as getBoundingClientRect already accounts for CSS transforms

        return {
            left: rect.left / appScale,
            top: rect.top / appScale,
            right: rect.right / appScale,
            bottom: rect.bottom / appScale,
            width: rect.width / appScale,
            height: rect.height / appScale,
            x: rect.x / appScale,
            y: rect.y / appScale
        };
    },

    /**
     * Get scaled mouse coordinates from event (compensates for app scaling only)
     * @param {Event} e - Mouse event
     * @returns {object} Object with x and y properties in scaled coordinates
     */
    getScaledMouseCoords(e) {
        const appScale = this.detectAppScale();
        return {
            x: e.clientX / appScale,
            y: e.clientY / appScale
        };
    },

    /**
     * Initialize scale detection with optional change callback
     * @param {function} [onScaleChange] - Callback function called when scale changes
     * @returns {MutationObserver} Observer instance for cleanup
     */
    initScaleDetection(onScaleChange = null) {
        // Detect scale on initialization
        this.detectAppScale();

        // Listen for scale changes (if the app scale changes dynamically)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const oldScale = this._appScale;
                    const newScale = this.detectAppScale();
                    if (oldScale !== newScale) {
                        // Trigger callback if provided
                        if (onScaleChange && typeof onScaleChange === 'function') {
                            onScaleChange(newScale, oldScale);
                        }
                    }
                }
            });
        });

        // Observe the app window for class changes
        const appWindow = document.querySelector('.app-window');
        if (appWindow) {
            observer.observe(appWindow, {
                attributes: true,
                attributeFilter: ['class']
            });
        }

        return observer;
    },

    /**
     * Get current cached app scale (without re-detection)
     * @returns {number} Cached app scale factor
     */
    getCurrentScale() {
        return this._appScale;
    },

    /**
     * Force refresh of scale detection
     * @returns {number} New scale factor
     */
    refreshScale() {
        return this.detectAppScale();
    }
};

// Extend SypnexAPI with scaling methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Access to scaling utilities
     * @type {object}
     * @memberof SypnexAPI.prototype
     */
    get scaling() {
        return scalingUtils;
    },

    /**
     * Convenience method: Detect current app scale
     * @memberof SypnexAPI.prototype
     * @returns {number} Scale factor
     */
    detectAppScale() {
        return scalingUtils.detectAppScale();
    },

    /**
     * Convenience method: Get scaled mouse coordinates
     * @param {Event} e - Mouse event
     * @memberof SypnexAPI.prototype
     * @returns {object} Scaled coordinates
     */
    getScaledMouseCoords(e) {
        return scalingUtils.getScaledMouseCoords(e);
    },

    /**
     * Convenience method: Get scaled element bounds
     * @param {Element} element - DOM element
     * @memberof SypnexAPI.prototype
     * @returns {object} Scaled bounding rectangle
     */
    getScaledBoundingClientRect(element) {
        return scalingUtils.getScaledBoundingClientRect(element);
    },

    /**
     * Convenience method: Convert screen to app coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {number} [zoomScale=1.0] - Optional zoom scale
     * @memberof SypnexAPI.prototype
     * @returns {object} App coordinates
     */
    screenToAppCoords(screenX, screenY, zoomScale = 1.0) {
        return scalingUtils.screenToAppCoords(screenX, screenY, zoomScale);
    },

    /**
     * Convenience method: Convert app to screen coordinates
     * @param {number} appX - App X coordinate
     * @param {number} appY - App Y coordinate
     * @param {number} [zoomScale=1.0] - Optional zoom scale
     * @memberof SypnexAPI.prototype
     * @returns {object} Screen coordinates
     */
    appToScreenCoords(appX, appY, zoomScale = 1.0) {
        return scalingUtils.appToScreenCoords(appX, appY, zoomScale);
    },

    /**
     * Convenience method: Initialize scale detection
     * @param {function} [onScaleChange] - Callback for scale changes
     * @memberof SypnexAPI.prototype
     * @returns {MutationObserver} Observer instance
     */
    initScaleDetection(onScaleChange = null) {
        return scalingUtils.initScaleDetection(onScaleChange);
    }
});
