function success(res, data = {}, status = 200) {

    return res.status(status).json({
        success: true,
        ...data
    });

}


function error(res, error = "Server Error", status = 500) {

    if(error instanceof Error) {
        return res.status(error.status || status).json({
            success: false,
            code: error.code,
            message: error.message
        })
    }

    return res.status(status).json({
        success: false,
        message: error
    });

}


module.exports = {
    success,
    error
};