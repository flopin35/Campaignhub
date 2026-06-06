import { motion } from 'framer-motion';

export default function Settings() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Platform configuration and preferences.</p>

        <div className="space-y-6">
          <div className="card">
            <h3 className="font-medium text-white mb-4">Platform Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span className="text-gray-300">1.0.0 MVP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Flow</span>
                <span className="text-gray-300">Manual</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Auto-Expiry</span>
                <span className="text-emerald-400">Enabled</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-medium text-white mb-4">Campaign Durations</h3>
            <div className="flex flex-wrap gap-2">
              {[7, 14, 30, 60].map((d) => (
                <span key={d} className="badge-active">{d} days</span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-medium text-white mb-2">Notifications</h3>
            <p className="text-sm text-gray-500">
              Email notifications are logged to console in MVP mode.
              Configure SMTP in production for real delivery.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
