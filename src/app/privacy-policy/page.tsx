import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-grow py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 md:p-12 shadow-sm rounded-xl border border-gray-100">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          
          <div className="space-y-8 text-gray-700">
            <section className="bg-blue-50 border-l-4 border-[#0074c8] p-6 rounded-r-lg">
              <h2 className="text-xl font-bold text-[#0074c8] mb-3">CRITICAL: On-Device Data Isolation</h2>
              <p className="font-medium text-gray-800">
                At SaralGati, we prioritize the privacy and dignity of our elderly users above all else. 
                We explicitly guarantee that all elder usage data—including screen interactions, visual processing, and app usage patterns—is processed locally ON the elder's device by our accessibility agent.
              </p>
              <p className="mt-2 text-gray-800">
                We DO NOT send screen recordings, raw interaction logs, or personal messages to our cloud servers. Only aggregated habit patterns and critical alert events (such as SOS triggers) are synced to the cloud to notify caregivers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
              <p>We collect information in the following ways:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Caregiver Information:</strong> Name, email, phone number, and relationship to the elder.</li>
                <li><strong>Elder Profile Information:</strong> Name, age, preferred language, and specific accessibility needs.</li>
                <li><strong>Aggregated Telemetry:</strong> Anonymized usage statistics to improve our services.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
              <p>The information we collect is used solely to provide and improve the SaralGati service:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>To facilitate real-time alerts to designated caregivers.</li>
                <li>To personalize the AI guidance based on on-device habit learning.</li>
                <li>To provide customer support and communicate important updates.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Data Storage and Security</h2>
              <p>
                Cloud data is stored securely using enterprise-grade encryption. We use secure databases (PostgreSQL via Neon) and implement stringent access controls. Remember, sensitive on-screen data never leaves the elder's smartphone.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Information Sharing</h2>
              <p>
                We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information with our business partners for statistical analysis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your data at any time. Caregivers can manage or delete elder profiles directly from their dashboard. Deleting a profile immediately purges the associated cloud data.
              </p>
            </section>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
