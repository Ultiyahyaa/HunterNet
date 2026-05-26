const multer =
    require("multer");

const path =
    require("path");

const crypto =
    require("crypto");

const storage =
    multer.diskStorage({

        destination:
            (
                req,
                file,
                cb
            ) => {

                cb(
                    null,
                    path.join(
                        __dirname,
                        "../public/uploads/chat"
                    )
                );
            },

        filename:
            (
                req,
                file,
                cb
            ) => {

                const ext =
                    path.extname(
                        file.originalname
                    );

                const filename =
                    crypto.randomBytes(16)
                        .toString("hex");

                cb(
                    null,
                    `${filename}${ext}`
                );
            }
    });

const fileFilter =
    (
        req,
        file,
        cb
    ) => {

        const allowed =
            [
                "image/png",
                "image/jpeg",
                "image/webp",
                "image/gif"
            ];

        if (
            allowed.includes(
                file.mimetype
            )
        ) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Invalid file type"
                )
            );
        }
    };

module.exports =
    multer({

        storage,

        fileFilter,

        limits: {

            fileSize:
                10 * 1024 * 1024,

            files: 8
        }
    });