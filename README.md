# Gong_fe

Debug:
If the client is running and you want to kill it and you don't know how.
Run: ps aux | grep ngsw-worker 
and kill the process
this didn't work since the process is being created all the time

To fix chokidar error - increate the number of watchers.

Read number of watchers: cat /proc/sys/fs/inotify/max_user_watches
Increase the number permenantly

echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/40-ide-watchers.conf

Apply changes:
sudo sysctl --system
