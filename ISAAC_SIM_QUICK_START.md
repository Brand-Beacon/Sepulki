# 🚀 Isaac Sim Quick Start Guide

## ⚡ TL;DR - Get Isaac Sim Running in 3 Steps

```bash
# 1. Start Isaac Sim on AWS
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "cd isaac-sim && ./start-isaac-sim-with-client.sh && docker run -d --name isaac-webrtc-client -p 8889:80 -v /home/ubuntu/isaac-webrtc-client:/usr/share/nginx/html:ro nginx:alpine"

# 2. Start Sepulki Forge frontend
cd apps/forge-ui && npm run dev

# 3. Open browser
open http://localhost:3001/configure
```

**That's it!** Isaac Sim WebRTC stream will be embedded in the configure page. 🎉

---

## 📋 **Current Configuration**

### AWS Instance
- **ID**: i-0b806fdb30fa36589
- **IP**: 18.234.83.45  
- **Type**: g5.xlarge (NVIDIA A10G, 23GB VRAM)
- **Status**: Running
- **Cost**: ~$1/hour

### Isaac Sim
- **Version**: 2023.1.1
- **Container**: isaac-sim-container
- **WebRTC Port**: 8211
- **Client Port**: 8889

### Frontend
- **URL**: http://localhost:3001/configure
- **Component**: IsaacSimDisplayDirect
- **iframe**: Embedding Omniverse WebRTC client

---

## 🎬 **Startup Sequence**

### Option 1: Quick Start (Instance Already Running)
```bash
# 1. Start Isaac Sim (if not already running)
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "docker ps | grep isaac-sim || (cd isaac-sim && ./start-isaac-sim-with-client.sh)"

# 2. Start WebRTC client server (if not already running)
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "docker ps | grep isaac-webrtc-client || docker run -d --name isaac-webrtc-client -p 8889:80 -v /home/ubuntu/isaac-webrtc-client:/usr/share/nginx/html:ro nginx:alpine"

# 3. Start frontend
cd apps/forge-ui && npm run dev

# 4. Access
open http://localhost:3001/configure
```

### Option 2: Full Start (Instance Stopped)
```bash
# 1. Start AWS instance
aws ec2 start-instances --instance-ids i-0b806fdb30fa36589

# 2. Wait for instance to boot (2-3 minutes)
sleep 120

# 3. Start Isaac Sim and WebRTC client
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "cd isaac-sim && ./start-isaac-sim-with-client.sh && sleep 5 && docker run -d --name isaac-webrtc-client -p 8889:80 -v /home/ubuntu/isaac-webrtc-client:/usr/share/nginx/html:ro nginx:alpine"

# 4. Start frontend
cd apps/forge-ui && npm run dev

# 5. Access
open http://localhost:3001/configure
```

### Option 3: Fresh Deployment
```bash
# 1. Deploy new g5.xlarge instance
cd infrastructure/aws
./deploy-isaac-sim-g5.sh

# 2. Install Isaac Sim (wait 2-3 min for instance boot first)
sleep 120
./install-isaac-sim-g5.sh

# 3. Copy WebRTC client files
ssh -i sepulki-isaac-sim.pem ubuntu@<NEW_IP> "docker pull nvcr.io/nvidia/isaac-sim:2023.1.1 && docker run --rm -v /home/ubuntu/isaac-webrtc-client:/out nvcr.io/nvidia/isaac-sim:2023.1.1 bash -c 'cp -r /isaac-sim/extscache/omni.services.streamclient.webrtc-1.3.8/web/* /out/'"

# 4. Update .env.local with new IP
cd ../../apps/forge-ui
# Edit .env.local: NEXT_PUBLIC_ISAAC_SIM_IP=<NEW_IP>

# 5. Start services and frontend (see Option 2)
```

---

## 🛑 **Shutdown Sequence**

### Stop Services (Keep Instance Running)
```bash
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "docker stop isaac-sim-container isaac-webrtc-client"
```

### Stop Instance (Save Costs)
```bash
aws ec2 stop-instances --instance-ids i-0b806fdb30fa36589
```

### Terminate Instance (Permanent Delete)
```bash
# ⚠️ WARNING: This permanently deletes the instance
aws ec2 terminate-instances --instance-ids i-0b806fdb30fa36589
```

---

## 🔍 **Troubleshooting**

### Issue: WebRTC client shows {"detail":"Not Found"}
**Solution**: Make sure both containers are running:
```bash
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "docker ps"
# Should see both isaac-sim-container and isaac-webrtc-client
```

### Issue: Frontend shows "Isaac Sim Service Offline"
**Solution**: Verify Isaac Sim is running and ports are accessible:
```bash
# Check Isaac Sim logs
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "docker logs isaac-sim-container | grep 'Streaming server started'"

# Test port accessibility
curl -I http://18.234.83.45:8889/
```

### Issue: GPU not detected
**Solution**: Reboot the instance after driver installation:
```bash
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "sudo reboot"
# Wait 2 minutes, then verify: nvidia-smi
```

### Issue: Page redirects to home
**Solution**: Set required localStorage:
```javascript
// In browser console:
localStorage.setItem('requirementAnalysis', 'Test warehouse robot requirements');
localStorage.setItem('userInput', 'I need a warehouse robot');
location.reload();
```

---

## 📊 **Monitoring**

### Check Isaac Sim Status
```bash
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "docker logs --tail 50 isaac-sim-container | grep -i 'streaming\|ready\|error'"
```

### Check GPU Usage
```bash
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "nvidia-smi"
```

### Check Network Connections
```bash
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "sudo ss -tlnp | grep '8211\|8889'"
```

### Check Disk Space
```bash
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "df -h /"
```

---

## 🔗 **Useful URLs**

### Direct Access
- **Isaac Sim WebRTC Client**: http://18.234.83.45:8889/?server=18.234.83.45
- **Isaac Sim Streaming Server**: http://18.234.83.45:8211

### Frontend
- **Configure Page**: http://localhost:3001/configure
- **Home**: http://localhost:3001

### AWS
- **EC2 Console**: https://console.aws.amazon.com/ec2/
- **Instance**: i-0b806fdb30fa36589

---

## 📚 **Related Documentation**

- `ISAAC_SIM_SUCCESS.md` - Detailed success documentation with all technical details
- `ISAAC_SIM_INTEGRATION_COMPLETE.md` - Full integration architecture and implementation
- `ISAAC_SIM_WEBRTC_READY.md` - WebRTC configuration and endpoints
- `ISAAC_SIM_FINAL_REPORT.md` - Executive summary and business impact

---

## ⚡ **One-Command Restart**

If everything is already deployed and you just want to restart:

```bash
# One command to rule them all
ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "docker start isaac-sim-container isaac-webrtc-client 2>/dev/null || (cd isaac-sim && ./start-isaac-sim-with-client.sh && docker run -d --name isaac-webrtc-client -p 8889:80 -v /home/ubuntu/isaac-webrtc-client:/usr/share/nginx/html:ro nginx:alpine)" && cd apps/forge-ui && npm run dev
```

Then open: http://localhost:3001/configure

---

## ✅ **Verification Checklist**

Before demo/presentation, verify:
- [ ] AWS instance running: `aws ec2 describe-instances --instance-ids i-0b806fdb30fa36589 --query 'Reservations[0].Instances[0].State.Name'`
- [ ] Isaac Sim container running: `ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "docker ps | grep isaac-sim"`
- [ ] WebRTC client running: `ssh -i sepulki-isaac-sim.pem ubuntu@18.234.83.45 "docker ps | grep isaac-webrtc-client"`
- [ ] WebRTC client accessible: `curl -I http://18.234.83.45:8889/`
- [ ] Frontend dev server running: `curl -I http://localhost:3001/`
- [ ] Page loads: Open http://localhost:3001/configure in browser
- [ ] Isaac Sim Display component visible with iframe
- [ ] Status shows "✅ Connected"
- [ ] Robot recommendations visible

---

## 🎯 **Success!**

**Real NVIDIA Isaac Sim is now integrated into Sepulki Forge and ready for production use!** 🎊

For detailed technical information, see `ISAAC_SIM_SUCCESS.md`.






