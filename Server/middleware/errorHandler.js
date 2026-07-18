function errorHandler(err, req, res, next) {

    if(err.log){
        console.log(err);
    }

    res.status(err.status || 500).json({

        success: false,
        code: err.code || "SERVER_ERROR",
        message: err.message || "Internal Server Error"

    });
}

module.exports = errorHandler;