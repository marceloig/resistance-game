import AppLayout from "@cloudscape-design/components/app-layout";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useEventsConnection } from "./hooks/useEventsConnection";

export default function App() {
  const { status } = useEventsConnection();

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: "/",
            title: "Amplify Game Base",
          }}
          utilities={[
            {
              type: "button",
              text: `Events: ${status}`,
              iconName: "status-positive",
            },
          ]}
        />
      </div>

      <AppLayout
        navigationHide
        toolsHide
        content={
          <ContentLayout
            header={
              <Header variant="h1" description="Projeto base com AppSync Events, Amplify Gen 2 e Cloudscape">
                Amplify Game Base
              </Header>
            }
          >
            <SpaceBetween size="l">
              <Container header={<Header variant="h2">Status da Conexão</Header>}>
                <Box variant="p">
                  Conexão com AppSync Events:{" "}
                  <Box variant="span" fontWeight="bold">
                    {status}
                  </Box>
                </Box>
                <Box variant="p" color="text-body-secondary">
                  Este é o projeto base. A lógica do jogo será implementada sobre esta estrutura.
                </Box>
              </Container>

              <Container header={<Header variant="h2">Arquitetura</Header>}>
                <SpaceBetween size="s">
                  <Box variant="p">
                    <Box variant="span" fontWeight="bold">Frontend:</Box> React + Vite + Cloudscape Design System
                  </Box>
                  <Box variant="p">
                    <Box variant="span" fontWeight="bold">Backend:</Box> AWS Amplify Gen 2 (TypeScript)
                  </Box>
                  <Box variant="p">
                    <Box variant="span" fontWeight="bold">Real-time:</Box> AWS AppSync Events (WebSocket pub/sub)
                  </Box>
                </SpaceBetween>
              </Container>
            </SpaceBetween>
          </ContentLayout>
        }
      />
    </>
  );
}
