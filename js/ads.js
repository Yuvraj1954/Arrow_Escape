/**
 * Rewarded-ad hooks (not active). Wire to your SDK when ready.
 * Rewarded only — no forced interstitials.
 */
const AdHooks = {
    isAvailable() {
        return false;
    },

    /** @returns {Promise<boolean>} granted */
    async requestExtraLife() {
        return false;
    },

    /** @returns {Promise<boolean>} granted */
    async requestHint() {
        return false;
    },

    /** @returns {Promise<boolean>} granted */
    async requestSkipLevel() {
        return false;
    }
};

function canShowRewardedAd() {
    return typeof AdHooks !== "undefined" && AdHooks.isAvailable();
}
