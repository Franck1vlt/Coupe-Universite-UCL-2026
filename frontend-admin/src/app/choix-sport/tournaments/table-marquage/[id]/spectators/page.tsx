import SpectatorsClient from './SpectatorsClient';
import { getSportConfig, isValidSport, type SportCode } from '../../config';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SpectatorsPage({ params }: PageProps) {
  const { id } = await params;
  if (!isValidSport(id)) {
    notFound();
  }

  const sportCode = id as SportCode;
  const config = getSportConfig(sportCode);

  if (!config) {
    notFound();
  }

  return <SpectatorsClient sportCode={sportCode} config={config} />;
}

export async function generateStaticParams() {
  return [
    { id: 'football' },
    { id: 'handball' },
    { id: 'basketball' },
    { id: 'volleyball' },
    { id: 'badminton' },
    { id: 'petanque' },
    { id: 'flechettes' },
  ];
}