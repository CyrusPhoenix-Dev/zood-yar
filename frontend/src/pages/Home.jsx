import HeroSlider from '../components/HeroSlider'
import Service from '../components/Service'
import TeamSlider from '../components/TeamSlider'
import Quote from '../components/Quote'
import AboutSection from '../components/AboutSection'
import PlansSection from '../components/PlansSection'

function Home() {
    return (
        <>
            <HeroSlider></HeroSlider>
            <Service></Service>
            <TeamSlider></TeamSlider>
            <PlansSection></PlansSection>
            <Quote></Quote>
            <AboutSection></AboutSection>
        </>
    );
}
export default Home