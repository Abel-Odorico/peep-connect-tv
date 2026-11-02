"""Bounded, read-only CPU/memory diagnostics over the existing ADB connection."""
import re,subprocess,threading,time
_lock=threading.Lock()
_previous=None
_cache=None
SHELL='''echo __PEEP_CPU__; head -n 1 /proc/stat
echo __PEEP_LOAD__; cat /proc/loadavg
echo __PEEP_MEM__; cat /proc/meminfo
echo __PEEP_TEMP__; cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || true
'''

def parse_cpu(text):
 match=re.search(r'^cpu\s+([\d\s]+)$',text,flags=re.M)
 if not match:return None
 fields=[int(x) for x in match[1].split()[:8]]
 if len(fields)<4:return None
 return {'total':sum(fields),'idle':fields[3]+(fields[4] if len(fields)>4 else 0)}

def cpu_percent(previous,current):
 if not previous or not current:return None
 total=current['total']-previous['total'];idle=current['idle']-previous['idle']
 if total<=0 or idle<0 or idle>total:return None
 return round(100*(total-idle)/total,1)

def snapshot(adb,device):
 global _previous,_cache
 with _lock:
  now=time.monotonic()
  if _cache and _cache['device']==device and now-_cache['time']<3:return _cache['value']
  result=subprocess.run([str(adb),'-s',device,'shell',SHELL],capture_output=True,text=True,timeout=10)
  if result.returncode:raise OSError('A TV não respondeu ao diagnóstico de performance.')
  text=result.stdout;cpu=parse_cpu(text)
  previous=_previous['cpu'] if _previous and _previous['device']==device else None
  usage=cpu_percent(previous,cpu);_previous={'device':device,'cpu':cpu}
  mem={k:int(v)*1024 for k,v in re.findall(r'^(MemTotal|MemAvailable|MemFree|Cached|Buffers|SReclaimable|Shmem|SwapTotal|SwapFree):\s+(\d+)',text,re.M)}
  sections=re.split(r'^__PEEP_([A-Z]+)__\s*$',text,flags=re.M);parts={sections[i]:sections[i+1].strip() for i in range(1,len(sections)-1,2)}
  temp=None
  try:
   raw=float(parts.get('TEMP',''));temp=raw/1000 if abs(raw)>500 else raw
   if not -20<temp<160:temp=None
  except ValueError:pass
  load=None
  try:load=[float(x) for x in parts.get('LOAD','').split()[:3]]
  except ValueError:pass
  value={'at':time.time(),'cpu':{'usagePercent':usage,'available':cpu is not None,'warmingUp':cpu is not None and previous is None},'memory':mem,'loadAverage':load,'thermal':{'celsius':temp,'label':'Sensor térmico 0','identified':False},'sampleIntervalSeconds':15}
  _cache={'device':device,'time':now,'value':value};return value
