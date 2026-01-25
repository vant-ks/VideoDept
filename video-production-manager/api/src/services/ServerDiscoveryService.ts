import Bonjour from 'bonjour-service';
import os from 'os';

interface ServerInfo {
  name: string;
  host: string;
  port: number;
  addresses: string[];
}

export class ServerDiscoveryService {
  private bonjour: any;
  private service: any;
  private isAdvertising = false;

  constructor(
    private serviceName: string = 'Video Production Server',
    private serviceType: string = 'video-prod-api'
  ) {
    this.bonjour = new Bonjour();
  }

  /**
   * Start advertising this server on the local network
   */
  advertise(port: number): void {
    if (this.isAdvertising) {
      console.log('⚠️  Already advertising on the network');
      return;
    }

    const localAddresses = this.getLocalIpAddresses();
    
    this.service = this.bonjour.publish({
      name: this.serviceName,
      type: this.serviceType,
      port,
      txt: {
        version: '1.0.0',
        mode: 'lan-server',
        addresses: localAddresses.join(',')
      }
    });

    this.isAdvertising = true;

    console.log('📡 Server Discovery:');
    console.log(`   Service Name: ${this.serviceName}`);
    console.log(`   Port: ${port}`);
    console.log(`   Local IPs:`);
    localAddresses.forEach(ip => console.log(`      - http://${ip}:${port}`));
  }

  /**
   * Stop advertising this server
   */
  stopAdvertising(): void {
    if (this.service) {
      this.service.stop();
      this.isAdvertising = false;
      console.log('🛑 Stopped advertising server on network');
    }
  }

  /**
   * Find all Video Production servers on the local network
   */
  async findServers(timeoutMs: number = 5000): Promise<ServerInfo[]> {
    return new Promise((resolve) => {
      const foundServers: ServerInfo[] = [];
      const seenServices = new Set<string>();

      const browser = this.bonjour.find({ type: this.serviceType });

      browser.on('up', (service: any) => {
        const serviceKey = `${service.host}:${service.port}`;
        
        if (!seenServices.has(serviceKey)) {
          seenServices.add(serviceKey);
          
          const addresses = service.txt?.addresses 
            ? service.txt.addresses.split(',')
            : [service.host];

          foundServers.push({
            name: service.name,
            host: service.host,
            port: service.port,
            addresses
          });

          console.log(`🔍 Found server: ${service.name} at ${service.host}:${service.port}`);
        }
      });

      // Stop searching after timeout
      setTimeout(() => {
        browser.stop();
        resolve(foundServers);
      }, timeoutMs);
    });
  }

  /**
   * Get all local IP addresses for this machine
   */
  getLocalIpAddresses(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name in interfaces) {
      const iface = interfaces[name];
      if (!iface) continue;

      for (const details of iface) {
        // Skip internal (loopback) and non-IPv4 addresses
        if (!details.internal && details.family === 'IPv4') {
          addresses.push(details.address);
        }
      }
    }

    return addresses;
  }

  /**
   * Clean up on shutdown
   */
  shutdown(): void {
    this.stopAdvertising();
    if (this.bonjour) {
      this.bonjour.destroy();
    }
  }
}

export default ServerDiscoveryService;
