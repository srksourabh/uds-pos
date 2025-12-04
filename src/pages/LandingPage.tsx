import { Link } from 'react-router-dom';
import {
  Smartphone,
  Users,
  BarChart3,
  Shield,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Zap
} from 'lucide-react';

export function LandingPage() {

  const features = [
    {
      icon: Smartphone,
      title: 'POS Device Management',
      description: 'Track, assign, and manage POS devices across multiple banks with real-time inventory visibility.'
    },
    {
      icon: Users,
      title: 'Field Engineer Dispatch',
      description: 'Intelligent call assignment based on proximity, workload, and skill matching.'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reporting',
      description: 'Comprehensive dashboards and reports to monitor performance and identify trends.'
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Role-based access control with complete data isolation between banking partners.'
    },
    {
      icon: Clock,
      title: 'Real-Time Tracking',
      description: 'Monitor service calls, device status, and engineer locations in real-time.'
    },
    {
      icon: MapPin,
      title: 'Mobile-First Design',
      description: 'Native mobile experience for field engineers with offline support.'
    }
  ];

  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '< 2hr', label: 'Avg Response Time' },
    { value: '50K+', label: 'Devices Managed' },
    { value: '500+', label: 'Engineers' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">UDS Service</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/mobile/login"
                className="text-slate-300 hover:text-white transition-colors px-4 py-2"
              >
                Engineer Login
              </Link>
              <Link
                to="/login"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-blue-400 text-sm font-medium">Field Service Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Streamline Your
            <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              POS Operations
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            The complete field service management platform for POS device deployment,
            maintenance, and tracking across multiple banking partners.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/mobile/login"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 hover:from-blue-500 hover:via-cyan-400 hover:to-teal-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-blue-500/50"
            >
              <Smartphone className="w-5 h-5" />
              FSE Login
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all border border-slate-600 hover:border-slate-500"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A comprehensive platform designed for enterprise-scale POS device management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-blue-500/50 transition-colors group"
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join the leading banks using UDS Service to manage their POS device operations efficiently.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                Sign In Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">UDS Service</span>
            </div>
            <p className="text-slate-400 text-sm">
              Field Service Management Platform
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="/login"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Admin Login
              </Link>
              <Link
                to="/mobile/login"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Engineer Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
