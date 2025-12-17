import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/login"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Link>

        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="heading-1-responsive text-gray-900 mb-6">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: December 2024</p>

          <div className="prose prose-blue max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              UDS-POS ("we", "our", or "us") is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our Field Service Management Platform.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Name and contact information (email, phone number)</li>
              <li>Account credentials (username, password)</li>
              <li>Employment information (role, assigned banks)</li>
              <li>Location data (for field service operations)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">Device and Usage Information</h3>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Device identifiers and technical specifications</li>
              <li>Browser type and version</li>
              <li>IP address and approximate location</li>
              <li>Usage patterns and feature interactions</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">Business Data</h3>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>POS device serial numbers and status</li>
              <li>Service call records and history</li>
              <li>Photos taken during service calls</li>
              <li>Client information (names, addresses)</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>To provide and maintain the Service</li>
              <li>To process and complete service calls</li>
              <li>To track device inventory and movements</li>
              <li>To communicate with you about service updates</li>
              <li>To improve our Service and user experience</li>
              <li>To detect and prevent fraud or unauthorized access</li>
              <li>To comply with legal obligations</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">4. Information Sharing</h2>
            <p className="text-gray-600 mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Your employer or organization</li>
              <li>Service providers who assist in operating our platform</li>
              <li>Law enforcement when required by law</li>
              <li>Third parties with your explicit consent</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement appropriate technical and organizational measures to protect your
              information, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Role-based access controls</li>
              <li>Regular security audits and monitoring</li>
              <li>Secure authentication mechanisms</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your personal information for as long as necessary to provide the
              Service and fulfill the purposes outlined in this policy. Business records
              may be retained longer for legal, accounting, or audit purposes.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">7. Your Rights</h2>
            <p className="text-gray-600 mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request data portability</li>
              <li>Withdraw consent where applicable</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">8. Cookies and Tracking</h2>
            <p className="text-gray-600 mb-4">
              We use cookies and similar technologies to maintain your session, remember
              preferences, and analyze usage patterns. You can control cookie settings
              through your browser preferences.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">9. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">
              Our Service may integrate with third-party services such as:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Supabase (database and authentication)</li>
              <li>Sentry (error monitoring)</li>
              <li>Analytics providers</li>
            </ul>
            <p className="text-gray-600 mb-4">
              These services have their own privacy policies governing the use of your
              information.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-600 mb-4">
              Our Service is not intended for individuals under 18 years of age. We do not
              knowingly collect personal information from children.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">11. International Data Transfers</h2>
            <p className="text-gray-600 mb-4">
              Your information may be transferred to and processed in countries other than
              your own. We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Privacy Policy periodically. We will notify you of
              significant changes via email or through the Service.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">13. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions about this Privacy Policy or our data practices,
              please contact us at:
            </p>
            <p className="text-gray-600 mb-4">
              Email: privacy@uds-pos.com<br />
              Data Protection Officer: dpo@uds-pos.com<br />
              Address: [Company Address]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
