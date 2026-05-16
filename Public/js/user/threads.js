import { createThreadsCore } from "../core/threadsCore.js";

createThreadsCore({

    elements: {

        threadsList:
            document.getElementById("threadsList"),

        threadTitle:
            document.getElementById("threadTitle"),

        threadContent:
            document.getElementById("threadContent"),

        openCreateThreadBtn:
            document.getElementById("openCreateThreadBtn"),

        submitThreadBtn:
            document.getElementById("submitThreadBtn"),

        threadsFeed:
            document.getElementById("threadsFeed"),

        modal:
            document.getElementById("threadModal"),

        modalMessages:
            document.querySelector(".thread-messages"),

        modalInput:
            document.getElementById("threadReplyInput"),

        modalForm:
            document.querySelector(".thread-reply-form"),

        closeModalBtn:
            document.getElementById("closeThreadBtn"),

        refreshBtn:
            document.getElementById("refreshThreadsBtn")
    },

    api: {
        threads: "/threads/api"
    }
});