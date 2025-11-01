#!/bin/bash
# Isaac Sim SystemD Service Management Script

SERVICE_NAME="isaac-sim"
ISAAC_SIM_DIR="/home/ubuntu/isaac-sim"

case "$1" in
    start)
        echo "🚀 Starting Isaac Sim service..."
        sudo systemctl start $SERVICE_NAME
        echo "✅ Service started"
        ;;
    stop)
        echo "🛑 Stopping Isaac Sim service..."
        sudo systemctl stop $SERVICE_NAME
        echo "✅ Service stopped"
        ;;
    restart)
        echo "🔄 Restarting Isaac Sim service..."
        sudo systemctl restart $SERVICE_NAME
        echo "✅ Service restarted"
        ;;
    status)
        echo "📊 Isaac Sim service status:"
        sudo systemctl status $SERVICE_NAME --no-pager -l
        ;;
    enable)
        echo "🔧 Enabling Isaac Sim service..."
        sudo systemctl enable $SERVICE_NAME
        echo "✅ Service enabled"
        ;;
    disable)
        echo "🔧 Disabling Isaac Sim service..."
        sudo systemctl disable $SERVICE_NAME
        echo "✅ Service disabled"
        ;;
    logs)
        echo "📝 Isaac Sim service logs:"
        sudo journalctl -u $SERVICE_NAME -f
        ;;
    health)
        echo "🏥 Running health check..."
        cd $ISAAC_SIM_DIR
        ./health-check.sh
        ;;
    monitor)
        echo "📊 Starting monitor..."
        cd $ISAAC_SIM_DIR
        ./monitor.sh
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|enable|disable|logs|health|monitor}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the Isaac Sim service"
        echo "  stop     - Stop the Isaac Sim service"
        echo "  restart  - Restart the Isaac Sim service"
        echo "  status   - Show service status"
        echo "  enable   - Enable service to start on boot"
        echo "  disable  - Disable service from starting on boot"
        echo "  logs     - Show service logs (follow mode)"
        echo "  health   - Run health check"
        echo "  monitor  - Start monitoring dashboard"
        exit 1
        ;;
esac

