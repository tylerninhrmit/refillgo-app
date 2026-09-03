import { useCallback, useEffect, useRef, useState } from 'react';

const DEVICE_KEY = 'refillgo:kiosk:camera';

export function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceIdState] = useState<string | null>(() => localStorage.getItem(DEVICE_KEY));
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string>('');
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      setLabel(stream.getVideoTracks()[0]?.label ?? 'Camera');
      setReady(true);
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'videoinput'));
    } catch (e) {
      setError((e as Error).message || 'Camera unavailable');
    }
  }, [deviceId, stop]);

  const setDeviceId = useCallback((id: string | null) => {
    if (id) localStorage.setItem(DEVICE_KEY, id);
    else localStorage.removeItem(DEVICE_KEY);
    setDeviceIdState(id);
  }, []);

  const cycle = useCallback(() => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(idx + 1) % devices.length];
    setDeviceId(next.deviceId);
  }, [devices, deviceId, setDeviceId]);

  useEffect(() => {
    if (!enabled) return;
    void start();
    return stop;
  }, [enabled, start, stop]);

  return { videoRef, devices, deviceId, setDeviceId, cycle, error, label, ready, restart: start };
}
