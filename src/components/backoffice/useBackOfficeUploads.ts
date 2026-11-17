import { useState, useEffect, useRef } from 'react';
import { prepareVideoUpload } from '../../lib/video-compression';


/** One upload/compression controller shared by product media and both hero videos. */
export function useBackOfficeUploads() {
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [mediaPreparing, setMediaPreparing] = useState(false);
    const [videoProgress, setVideoProgress] = useState(null);
    const [videoCompressing, setVideoCompressing] = useState(false);
    const videoAbort = useRef(null);

    useEffect(() => () => videoAbort.current?.abort(), []);

    const prepareLocalVideo = async (file, options?: { stripAudio?: boolean }) => {
        const controller = new AbortController();
        videoAbort.current = controller;
        setVideoCompressing(true);
        try { return await prepareVideoUpload(file, setVideoProgress, controller.signal, options); }
        catch (error) { setVideoProgress({ text: error.message }); throw error; }
        finally { setVideoCompressing(false); videoAbort.current = null; }
    };

    return {
        uploadProgress, setUploadProgress, uploadStatus, setUploadStatus, mediaPreparing, setMediaPreparing,
        videoProgress, setVideoProgress, videoCompressing, videoAbort, prepareLocalVideo
    };
}

export type BackOfficeUploads = ReturnType<typeof useBackOfficeUploads>;
