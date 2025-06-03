# Aire Claro

Aire Claro is a platform that provides real-time information about air quality in the Metropolitan Area of Monterrey and Saltillo. The platform combines data from official stations and citizen sensors to provide the most comprehensive coverage of the region.

## 🚀 Features

- Real-time air quality monitoring
- Data from official stations (SIMA) and citizen sensors (Purple Air)
- PM2.5 particle measurements
- Interactive map visualization
- Information based on the Mexican Air and Health Index
- Responsive interface for mobile and desktop devices

## 🛠️ Technologies

- [Next.js](https://nextjs.org/) - React Framework
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript Superset
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [Mapbox GL](https://www.mapbox.com/mapbox-gl-js) - Map Visualization
- [Supabase](https://supabase.com/) - Backend and Database
- [Recharts](https://recharts.org/) - Data Visualization
- [Vercel Analytics](https://vercel.com/analytics) - Web Analytics

## 📋 Prerequisites

- Node.js (recommended version: 18.x or higher)
- pnpm (package manager)

## 🔧 Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/aireclaro.git
cd aireclaro
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env.local` file in the project root with the following environment variables:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## 🚀 Available Scripts

- `pnpm dev` - Starts the development server
- `pnpm build` - Builds the application for production
- `pnpm start` - Starts the production server
- `pnpm lint` - Runs the linter

## 📊 Data Sources

- [SIMA](http://aire.nl.gob.mx/) - Comprehensive Environmental Monitoring System
- [Purple Air](https://map.purpleair.com/) - Citizen Sensor Network

## 📝 License

This project is maintained by the Citizen Observatory of Air Quality (OCCAMM).

## 📧 Contact

For more information or questions, contact:

- Email: contacto@observatoriodelaire.com
- Website: [Observatorio del Aire](https://www.observatoriodelaire.com/)

## 🤝 Contributing

Contributions are welcome. Please read the contribution guidelines before submitting a pull request.

## 📚 Additional Resources

- [Privacy Policy](/aviso-privacidad)
- [Open Data](https://datamx.io/dataset/calidad-del-aire-en-nuevo-leon)

## 🌟 About

Aire Claro is a citizen science initiative that aims to provide transparent and accessible air quality information to the residents of Monterrey and Saltillo. The platform uses both official monitoring stations and citizen sensors to create the most comprehensive air quality monitoring network in the region.

## 🔍 Key Features in Detail

- **Real-time Monitoring**: Updates every hour with the latest air quality measurements
- **Multiple Data Sources**: Combines official SIMA stations with Purple Air citizen sensors
- **Health Risk Assessment**: Uses the Mexican Air and Health Index for risk assessment
- **Mobile-Friendly**: Optimized for both desktop and mobile devices
- **Data Transparency**: All data is publicly available and can be downloaded
- **Interactive Maps**: Visual representation of air quality across the metropolitan area
- **Historical Data**: Access to historical air quality measurements

## 🎯 Project Goals

- Provide accurate and accessible air quality information
- Promote citizen participation in environmental monitoring
- Increase awareness about air quality issues
- Support informed decision-making regarding outdoor activities
- Contribute to public health protection
