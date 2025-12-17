import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TermsOfService() {
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
          <h1 className="heading-1-responsive text-gray-900 mb-6">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: December 2024</p>

          <div className="prose prose-blue max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing and using the UDS-POS Field Service Management Platform ("Service"),
              you accept and agree to be bound by these Terms of Service. If you do not agree
              to these terms, please do not use the Service.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              UDS-POS is a field service management platform designed for POS device inventory
              management, service call tracking, and field engineer coordination. The Service
              includes web-based access, mobile applications, and related support services.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">3. User Accounts</h2>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>Account sharing is prohibited unless explicitly authorized</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Upload or transmit viruses or malicious code</li>
              <li>Collect or harvest user data without authorization</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">5. Data and Privacy</h2>
            <p className="text-gray-600 mb-4">
              Your use of the Service is also governed by our Privacy Policy. By using the
              Service, you consent to the collection and use of your information as described
              in the Privacy Policy.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">6. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              The Service and its original content, features, and functionality are owned by
              UDS-POS and are protected by international copyright, trademark, and other
              intellectual property laws.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">7. Service Availability</h2>
            <p className="text-gray-600 mb-4">
              We strive to maintain high availability but do not guarantee uninterrupted access
              to the Service. We may perform maintenance, updates, or modifications that
              temporarily affect availability.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              To the maximum extent permitted by law, UDS-POS shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages resulting
              from your use of or inability to use the Service.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">9. Termination</h2>
            <p className="text-gray-600 mb-4">
              We may terminate or suspend your account and access to the Service immediately,
              without prior notice, for conduct that we believe violates these Terms or is
              harmful to other users, us, or third parties.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users
              of significant changes via email or through the Service. Continued use after
              changes constitutes acceptance of the new Terms.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">11. Contact Information</h2>
            <p className="text-gray-600 mb-4">
              For questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-gray-600 mb-4">
              Email: legal@uds-pos.com<br />
              Address: [Company Address]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
