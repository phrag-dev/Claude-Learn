/**
 * crypto.js — AES-GCM encryption for PAT storage
 *
 * Uses Web Crypto API (built into all modern browsers).
 * - PBKDF2 key derivation (SHA-256, 100k iterations)
 * - AES-GCM 256-bit encryption
 * - Random salt (16 bytes) and IV (12 bytes) per encryption
 * - Passphrase never stored — only used to derive key in memory
 */

var DashCrypto = (function () {
    "use strict";

    var STORAGE_KEY = "claude_learn_token_encrypted";
    var PBKDF2_ITERATIONS = 100000;

    function bufToBase64(buf) {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
    }

    function base64ToBuf(b64) {
        var raw = atob(b64);
        var buf = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) {
            buf[i] = raw.charCodeAt(i);
        }
        return buf;
    }

    function deriveKey(passphrase, salt) {
        var enc = new TextEncoder();
        return crypto.subtle.importKey(
            "raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]
        ).then(function (keyMaterial) {
            return crypto.subtle.deriveKey(
                { name: "PBKDF2", salt: salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt", "decrypt"]
            );
        });
    }

    function encrypt(plaintext, passphrase) {
        var salt = crypto.getRandomValues(new Uint8Array(16));
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var enc = new TextEncoder();

        return deriveKey(passphrase, salt).then(function (key) {
            return crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                enc.encode(plaintext)
            );
        }).then(function (cipherBuf) {
            return {
                ciphertext: bufToBase64(cipherBuf),
                salt: bufToBase64(salt),
                iv: bufToBase64(iv)
            };
        });
    }

    function decrypt(encrypted, passphrase) {
        var salt = base64ToBuf(encrypted.salt);
        var iv = base64ToBuf(encrypted.iv);
        var ciphertext = base64ToBuf(encrypted.ciphertext);

        return deriveKey(passphrase, salt).then(function (key) {
            return crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );
        }).then(function (plainBuf) {
            return new TextDecoder().decode(plainBuf);
        });
    }

    // Public API
    return {
        /**
         * Encrypt token and save to localStorage.
         * Returns a Promise that resolves on success.
         */
        saveToken: function (token, passphrase) {
            return encrypt(token, passphrase).then(function (encrypted) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
            });
        },

        /**
         * Decrypt token from localStorage into sessionStorage.
         * Returns a Promise that resolves with the token.
         */
        unlockToken: function (passphrase) {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return Promise.reject(new Error("No token stored"));
            }
            var encrypted = JSON.parse(stored);
            return decrypt(encrypted, passphrase).then(function (token) {
                sessionStorage.setItem("claude_learn_token", token);
                return token;
            });
        },

        /**
         * Get the decrypted token from sessionStorage (current session only).
         */
        getToken: function () {
            return sessionStorage.getItem("claude_learn_token");
        },

        /**
         * Check if an encrypted token exists in localStorage.
         */
        hasStoredToken: function () {
            return localStorage.getItem(STORAGE_KEY) !== null;
        },

        /**
         * Check if token is unlocked for this session.
         */
        isUnlocked: function () {
            return sessionStorage.getItem("claude_learn_token") !== null;
        },

        /**
         * Lock: clear decrypted token from session.
         */
        lock: function () {
            sessionStorage.removeItem("claude_learn_token");
        },

        /**
         * Remove everything: encrypted token and session.
         */
        clearAll: function () {
            localStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem("claude_learn_token");
            sessionStorage.removeItem("claude_learn_repo");
        }
    };
})();
