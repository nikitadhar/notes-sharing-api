'use strict';

const { ObjectID } = require("loopback-connector-mongodb");

module.exports = function (Note) {
    Note.getAllNotes = async function (data) {
        console.log(data)
        try {
            let query = [
                {
                    $lookup: {
                        from: "subject", // ✅ correct collection name
                        localField: "subjectId",
                        foreignField: "_id",
                        as: "subject",
                        pipeline: [
                            {
                                $lookup: {
                                    from: "semester", // ✅ correct collection name
                                    localField: "semesterId",
                                    foreignField: "_id",
                                    as: "semester",
                                    pipeline: [
                                        {
                                            $lookup: {
                                                from: "course", // ✅ correct collection name
                                                localField: "courseId",
                                                foreignField: "_id",
                                                as: "course",
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },

                // Unwind arrays for easier matching
                { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$subject.semester", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$subject.semester.course", preserveNullAndEmptyArrays: true } },
            ];

            // Apply search text if provided
            if (data?.text && data?.text?.length > 0) {
                query.push({
                    $match: {
                        $or: [
                            { "subject.name": { $regex: data.text, $options: "i" } },
                            { "subject.semester.name": { $regex: data.text, $options: "i" } },
                            { "subject.semester.course.name": { $regex: data.text, $options: "i" } },
                            { "title": { $regex: data.text, $options: "i" } }, // Note name itself
                        ],
                    },
                });
            }
            if (data?.filter?.course && data?.filter?.course?.length > 0 && /^[0-9a-fA-F]{24}$/.test(data?.filter?.course)) {
                query.push({
                    $match: {
                        "subject.semester.course._id": new ObjectID(data.filter.course) // ✅ match by ObjectId
                    },
                });
            }
            if (data?.filter?.semester && data?.filter?.semester?.length > 0 && /^[0-9a-fA-F]{24}$/.test(data?.filter?.semester)) {
                query.push({
                    $match: {
                        "subject.semester._id": new ObjectID(data.filter.semester) // ✅ match by ObjectId
                    },
                });
            }
            if (data?.filter?.subject && data?.filter?.subject?.length > 0 && /^[0-9a-fA-F]{24}$/.test(data?.filter?.subject)) {
                console.log("data?.filter?.subject",typeof(data?.filter?.subject))
                query.push({
                    $match: {
                        "subject._id": new ObjectID(data.filter.subject) // ✅ match by ObjectId
                    },
                });
            }

            let res = Note.getDataSource().connector.collection("note");
            let notesData = await res.aggregate(query).toArray();
            return notesData;

        } catch (error) {
            console.log(error)
        }
    };

    Note.remoteMethod("getAllNotes", {
        accepts: {
            arg: "data",
            type: "noteId",
            description: `example:\n {"mobile": "9000090000"}`,
            http: { source: "body" },
        },
        returns: {
            arg: "response",
            type: "object",
            root: true,
            http: { source: "body" },
        },
    });
};
