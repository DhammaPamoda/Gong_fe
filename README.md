# Gong_fe

## Debug:
If the client is running and you want to kill it and you don't know how.
Run: ps aux | grep ngsw-worker 
and kill the process
this didn't work since the process is being created all the time

### To fix chokidar error - increate the number of watchers.

#### Read number of watchers: 
    cat /proc/sys/fs/inotify/max_user_watches

#### Increase the number permenantly
    echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/40-ide-watchers.conf

#### Apply changes:
    sudo sysctl --system

### Relay USB Not Responding

If the relay is not responding or not detected:

1. **Reconnect the relay USB cable**
   - Unplug the USB cable from the relay
   - Wait a few seconds
   - Plug it back in
   - Check if the device is detected: `lsusb | grep -i ftdi`

2. **Restart the machine**
   - If reconnecting the USB doesn't help, restart the machine:
     ```
     sudo reboot
     ```
   - After reboot, verify the relay is detected and the application is running
