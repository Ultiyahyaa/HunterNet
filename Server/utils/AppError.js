class AppError extends Error {

    constructor(code, message, status = 500, log = false) {

        super(message);

        this.name = "AppError";
        this.code = code;
        this.status = status;
        this.log = log;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;