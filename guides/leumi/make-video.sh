#!/bin/sh
# שימוש: ./make-video.sh n0.mp3 n1.mp3 n2.mp3 n3.mp3  (ארבעה קטעי קריינות, אחד לכל שקף) -> leumi-final.mp4
set -e
i=0; : > list.txt; ins=""; fl=""; t=0
for f in "$@"; do
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f"); dur=$(echo "$d + 1.2" | bc -l)
  printf "file 'leumi-%s.png'\nduration %s\n" $i $dur >> list.txt
  ins="$ins -i $f"; ms=$(echo "($t + 0.4) * 1000 / 1" | bc); fl="$fl[$((i+1)):a]adelay=$ms:all=1[v$i];"; t=$(echo "$t + $dur" | bc -l); i=$((i+1))
done
printf "file 'leumi-3.png'\n" >> list.txt
fl="${fl}[v0][v1][v2][v3]amix=inputs=4:normalize=0[a]"
ffmpeg -y -f concat -safe 0 -i list.txt $ins -filter_complex "$fl" -map 0:v -map "[a]" -vf fps=25,format=yuv420p -c:v libx264 -c:a aac -shortest -movflags +faststart leumi-final.mp4
