// CI/CD Test 2 - Verifying Vercel Auto-Deployment
import Header from '@/components/layout/Header';
import Hero from '@/components/landing/Hero';
import ArchitectureAnimation from '@/components/landing/ArchitectureAnimation';
import ConcurrencyAnimation from '@/components/landing/ConcurrencyAnimation';
import UploadDashboard from '@/components/dashboard/UploadDashboard';

export default function Home() {
  return (
    <div className="bg-neutral-950 font-sans text-neutral-200">
      <Header />
      <main>
        <Hero />
        <ArchitectureAnimation />
        <ConcurrencyAnimation />
        <UploadDashboard />
      </main>
    </div>
  );
}
